# nuna-content-service

Content service for the Nuna world platform. It owns the **composition layer**:
it composes **scenes**, **worlds**, **prefabs** and **game-sessions** — and
references scenes/prefabs by id. It deliberately does **not** deal with
individual entities, meshes, materials or coordinates — that is the iris engine
/ in-editor concern (the worldgraph).

Shapes mirror the container's `world.json`, `*.scene.json` and `.prefab`
catalogs so documents round-trip losslessly.

Persistence goes through **kaga** (the graph service, PostgreSQL-backed) — each
composition noun is stored as a kaga node; **Redis** provides cache / pub-sub.
The service holds no database of its own.

## Architecture

```
Client / container
  ↓
Gateway          routing · auth check
  ↓
World ─ resolves a composition (palette + placements + gating) for a runtime
  ├─ Scene    authored scene documents (referenced by the world palette)
  ├─ Prefab   reusable .prefab catalogs (metadata + kit URI · opaque kit)
  └─ Session  game-session registry (runtime instances of a world)
  ↓
Cache Layer      world · scene · prefab caches
  ↓
kaga (graph service · PostgreSQL) — each noun stored as a node
```

### The four composition nouns

| Noun         | What it is                                                                                  |
|--------------|---------------------------------------------------------------------------------------------|
| **prefab**   | A reusable `.prefab` kit, referenced by id via `kitRef` (a URI to a `.prefab` SQLite / zip / local asset). The kit's interior (meshes, materials, ...) is opaque to this service — that's the iris-engine concern. The catalog row carries only metadata + an optional `previewUri`. |
| **scene**    | An authored `*.scene.json` unit (entities/lights/materials). Stored as an opaque document, referenced by worlds. |
| **world**    | A composition: ordered **placements** (each names a scene + optional `whenProp` gate + opaque game `params`) + settings. Scenes are referenced **by name** directly — no palette key. There is **no transform**: how a scene maps into a world is game-specific and lives in `params`. Mirrors `world.json`. |
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

- `kaga/` — `kaga-client.ts`: HTTP client for the kaga graph service (the persistence backend).
- `cache/` — `memory-cache.ts` (hot tier) + `redis-cache.ts` (shared tier).
- `events/` — `event-bus.ts`: `world.published`, `scene.updated`, `prefab.registered`, `session.statusChanged`.
- `auth/` — bearer-token verification used by the gateway.
- `config/` — environment-driven configuration.

### Infrastructure (`src/infrastructure/`)

Concrete driver adapters (`redis`, `storage`). Each lazily loads its driver and
falls back to an in-memory stub, so the service runs end-to-end with no external
dependencies during development.

## Persistence: canonical doc as a kaga node

Each authored artifact is stored via **kaga** as a single node (`kind` =
`world` / `scene` / `prefab` / `session`), with its full **canonical JSON
document** in the node payload (lossless round-trip with the container's files).
kaga owns the storage (PostgreSQL) and assigns each node's id, which becomes the
domain id; there are no service-owned tables. Repositories (`*.repository.ts`)
translate domain objects to/from kaga nodes.

Generated record ids are **base62**, 11 chars (e.g. `7dKq2mX9aB0`) — assigned by kaga.

```
node(kind='world',   label=title, payload=WorldComposition)  -- placements embedded in payload
node(kind='scene',   label=name,  payload=SceneRecord)
node(kind='prefab',  label=name,  payload=PrefabCatalog)     -- kitRef → storage; kit is opaque
node(kind='session', label=worldId, payload=GameSession)
```

## World resolution (the compose step)

A world is resolved against effective settings to produce the **active**
placements a runtime should load. Gated placements (`whenProp`) are dropped
unless their setting is truthy; each surviving placement names its scene:

```
POST /world/overworld/resolve   { "props": { "game.show_garden": true } }
→ { world, title, props, placements: [ { id, scene, whenProp?, params? } ] }
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
| GET    | `/prefab/:id`         | Catalog metadata + resolved kit / preview refs.    |
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

Drivers (`redis`, `ws`) are optional dependencies — the service boots with
in-memory stubs if they're absent. Persistence needs a reachable kaga (set
`KAGA_URL`); `npm run dev` otherwise works out of the box.

## Run with Docker

```bash
docker compose -f docker/docker-compose.yml up --build
```

Brings up PostgreSQL, kaga (the persistence backend), Redis, and the service on
`:4000`.

## Layout

```
src/
  app.ts            express app factory
  main.ts           bootstrap (config → kaga/redis/storage → app → realtime)
  modules/          gateway · world · scene · prefab · session · realtime
  core/             kaga · cache · events · auth · config
  shared/           types · dto · utils · constants
  infrastructure/   redis · storage
tests/
docker/
```
