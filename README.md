# nuna-content-service

Content service for the Nuna world platform. It owns the **composition layer**:
it composes **scenes**, **worlds**, **prefabs** and **game-sessions** — and
references scenes/prefabs by id. It deliberately does **not** deal with
individual entities, meshes, materials or coordinates — that is the iris engine
/ in-editor concern (the worldgraph).

Shapes mirror the container's `world.json`, `*.scene.json` and `.prefab`
catalogs so documents round-trip losslessly.

Backed by **MariaDB** (persistence) and **Redis** (cache / pub-sub).

## Architecture

```
Client / container
  ↓
Gateway          routing · auth check
  ↓
World ─ resolves a composition (palette + placements + gating) for a runtime
  ├─ Scene    authored scene documents (referenced by the world palette)
  ├─ Prefab   reusable .prefab catalogs (templates · materials · previews)
  └─ Session  game-session registry (runtime instances of a world)
  ↓
Cache Layer      world · scene · prefab caches
  ↓
MariaDB
```

### The four composition nouns

| Noun         | What it is                                                                                  |
|--------------|---------------------------------------------------------------------------------------------|
| **prefab**   | A reusable `.prefab` kit: templates + materials + preview slots. Referenced by id; the kit blob lives in storage (`kitRef`). |
| **scene**    | An authored `*.scene.json` unit (entities/lights/materials). Stored as an opaque document, referenced by worlds. |
| **world**    | A composition: ordered **placements** (each names a scene + position/rotation/scale + optional `whenSetting` gate) + settings. Scenes are referenced **by name** directly — no palette key. Mirrors `world.json`. |
| **game-session** | A runtime instance of a world. This service is the **registry** (world ref, status, settings overrides, runtime endpoint); the runtime itself is owned by iris-player / the relay daemon. |

### Modules (`src/modules/`)

| Module     | Files                                             | Responsibility                                  |
|------------|---------------------------------------------------|-------------------------------------------------|
| `gateway`  | `routes.ts`, `middleware.ts`                       | Routing, auth check.                            |
| `world`    | `world.{service,controller,repository}.ts`, `world.resolve.ts` | Publish + resolve world compositions (gating).  |
| `scene`    | `scene.{service,controller,repository}.ts`        | CRUD over authored scene documents.             |
| `prefab`   | `prefab.{service,controller,repository}.ts`       | Register/serve prefab catalogs.                 |
| `session`  | `session.{service,controller,repository}.ts`      | Game-session registry + status lifecycle.       |
| `realtime` | `ws.gateway.ts`, `sync.service.ts`                | (optional) push world/scene/session updates.    |

### Core (`src/core/`)

- `db/` — `mariadb.ts` connection + `query-builder.ts`.
- `cache/` — `memory-cache.ts` (hot tier) + `redis-cache.ts` (shared tier).
- `events/` — `event-bus.ts`: `world.published`, `scene.updated`, `prefab.registered`, `session.statusChanged`.
- `auth/` — bearer-token verification used by the gateway.
- `config/` — environment-driven configuration.

### Infrastructure (`src/infrastructure/`)

Concrete driver adapters (`mariadb`, `redis`, `storage`). Each lazily loads its
driver and falls back to an in-memory stub, so the service runs end-to-end with
no external dependencies during development.

## Persistence: canonical doc + index tables

Each authored artifact is stored as its **canonical JSON document** (lossless
round-trip with the container's files), with derived **index tables** for
querying and gating:

Generated record ids are **base62** (e.g. `7dKq2mX9aB0c`).

```
worlds(id, title, version, comment, settings_json, doc_json)
  placements(id, world_id, ordinal, scene_name,       -- placement index
             pos_*, rot_*, scale_*, when_setting)
scenes(id, name, version, doc_json)
prefabs(id, slug, name, description, tags_json, kit_ref)
  prefab_materials(prefab_id, material_id, ...)
  prefab_previews(prefab_id, material_id, camera_preset, jpeg_ref)
sessions(id, world_id, status, settings_json, runtime_endpoint, created_at)
```

## World resolution (the compose step)

A world is resolved against effective settings to produce the **active**
placements a runtime should load. Gated placements (`whenSetting`) are dropped
unless their setting is truthy; each surviving placement names its scene:

```
POST /world/overworld/resolve   { "settings": { "game.show_garden": true } }
→ { world, title, settings, placements: [ { id, scene, position, … } ] }
```

The resolve logic is pure (`world.resolve.ts`) and unit-tested.

## HTTP surface

| Method | Path                  | Description                                        |
|--------|-----------------------|----------------------------------------------------|
| GET    | `/health`             | Liveness.                                          |
| GET    | `/world`              | List worlds.                                       |
| POST   | `/world`              | Publish a world composition (world.json).          |
| GET    | `/world/:id`          | Full world composition.                            |
| GET/POST | `/world/:id/resolve` | Resolve → active placements (settings via `?s=` or body). |
| PATCH  | `/world/:id`          | Update a world.                                    |
| DELETE | `/world/:id`          | Delete a world.                                    |
| GET    | `/scene`              | List scenes.                                       |
| POST   | `/scene`              | Create a scene document.                           |
| GET    | `/scene/:id`          | Fetch a scene document.                            |
| PATCH/DELETE | `/scene/:id`    | Update / delete a scene.                           |
| GET    | `/prefab`             | List prefab catalogs.                              |
| POST   | `/prefab`             | Register a prefab catalog.                         |
| GET    | `/prefab/:id`         | Catalog + materials + resolved preview refs.       |
| DELETE | `/prefab/:id`         | Delete a prefab.                                   |
| GET    | `/session`            | List game-sessions.                                |
| POST   | `/session`            | Create a session for a world.                      |
| GET    | `/session/:id`        | Fetch a session.                                   |
| PATCH  | `/session/:id`        | Drive status / settings / runtime endpoint.        |
| DELETE | `/session/:id`        | Stop + remove the session record.                  |

## Publish / session flow

```
container → POST /world (publish composition)
          → event: world.published → cache invalidation → realtime push

container → POST /session {worldId} → session registry record (status=created)
          → PATCH /session/:id {status:"running", runtimeEndpoint}
          → event: session.statusChanged → realtime push to subscribers
```

## Develop

```bash
npm install
cp .env.example .env
npm run dev        # tsx watch
npm run typecheck
npm test
```

Drivers (`mariadb`, `redis`, `ws`) are optional dependencies — the service
boots with in-memory stubs if they're absent, so `npm run dev` works out of the
box.

## Run with Docker

```bash
docker compose -f docker/docker-compose.yml up --build
```

Brings up MariaDB (migrations then seeds auto-applied on first boot from
`migrations/` and `seeds/`), Redis, and the service on `:4000`.

## Migrations & seeds

- `migrations/001_init_schema.sql` — canonical composition schema.
- `seeds/` — development dataset:
  - `001_initial_world.sql` — two scenes + the `overworld` composition (with a gated garden placement).
  - `002_forest_scene.sql` — a `forest` scene + a small world that places it twice.
  - `003_prefabs.sql` — a `tree` prefab catalog + a sample game-session.

## Layout

```
src/
  app.ts            express app factory
  main.ts           bootstrap (config → db/redis/storage → app → realtime)
  modules/          gateway · world · scene · prefab · session · realtime
  core/             db · cache · events · auth · config
  shared/           types · dto · utils · constants
  infrastructure/   mariadb · redis · storage
migrations/         ordered schema DDL
seeds/              development dataset (initial world · forest scene · prefabs)
tests/
docker/
```
