# nuna-content-service

Content service for the Nuna world platform. It owns **world content** — a flat,
chunk-partitioned set of entities — and serves it to clients as worlds, scenes,
entities, assets and streamed chunks, with an optional realtime gateway for live
updates.

Backed by **MariaDB** (persistence) and **Redis** (cache / pub-sub).

## Architecture

```
Client
  ↓
Gateway          routing · auth check · request forwarding
  ↓
World Module     the kern — world state, chunk mapping, entity façade
  ↓
Entity / Scene / Chunk Modules
  ↓
Cache Layer      chunk · scene · entity caches
  ↓
MariaDB
```

### Modules (`src/modules/`)

| Module     | Responsibility                                                            |
|------------|---------------------------------------------------------------------------|
| `gateway`  | `routes.ts` + `middleware.ts` — routing, auth check, internal forwarding.  |
| `world`    | Kern. Entity CRUD façade, world state, chunk mapping, persistence calls.   |
| `scene`    | Scenes are **queries** (filter + rules), evaluated → entity sets, cached.  |
| `entity`   | Create/update/delete entities, render-only components, transform updates. |
| `asset`    | Mesh lookup, material refs, file paths (gltf/bin).                         |
| `chunk`    | Spatial indexing, world partitioning, streaming logic.                    |
| `realtime` | (optional) WebSocket connections, live updates, scene diff push.          |

### Core (`src/core/`)

- `db/` — `mariadb.ts` connection + `query-builder.ts`.
- `cache/` — `memory-cache.ts` (hot tier) + `redis-cache.ts` (shared tier).
- `events/` — `event-bus.ts`: `entity.updated`, `scene.changed`, `chunk.loaded`.
- `auth/` — bearer-token verification used by the gateway.
- `config/` — environment-driven configuration.

### Infrastructure (`src/infrastructure/`)

Concrete driver adapters (`mariadb`, `redis`, `storage`). Each lazily loads its
driver and falls back to an in-memory stub, so the service runs end-to-end with
no external dependencies during development.

## The scene concept

A scene is **not** a stored copy of the world. It is a definition:

```ts
Scene = {
  filter: chunk-based | tag-based | entity-list,
  rules?: SceneRule[],
  // computed result: runtime only (cache), never persisted
}
```

`GET /scene/:id` loads the definition → builds the entity set → resolves assets
→ caches → returns.

## Entity model

```
entities                 entity_components (optional, render-only)
--------                 -----------------
id                       entity_id
type                     component_type
pos_x, pos_y, pos_z      data_json
mesh_id
chunk_x, chunk_y
```

## Performance: three caches

1. **Chunk cache** — loaded world sections.
2. **Scene cache** — computed entity sets.
3. **Entity cache** — hot entities.

## Runtime editing flow

```
Client → POST /entity → Entity Service → DB update
       → event: entity.updated → cache invalidation → realtime push (optional)
```

## HTTP surface

| Method | Path                       | Description                          |
|--------|----------------------------|--------------------------------------|
| GET    | `/health`                  | Liveness.                            |
| GET    | `/world/:id/state`         | World header.                        |
| GET    | `/world/:id/stream?x&z&radius` | Stream chunks around a position. |
| POST   | `/entity`                  | Create entity.                       |
| GET    | `/entity/:id`              | Fetch entity.                        |
| PATCH  | `/entity/:id`              | Update entity (transform/components).|
| DELETE | `/entity/:id`              | Delete entity.                       |
| POST   | `/scene`                   | Create scene definition.             |
| GET    | `/scene/:id`               | Evaluate scene → entities + assets.  |
| PATCH  | `/scene/:id/membership`    | Update scene rules.                  |
| GET    | `/asset/:id`               | Asset metadata.                      |
| GET    | `/asset/:id/mesh`          | Mesh + resolved materials.           |

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

