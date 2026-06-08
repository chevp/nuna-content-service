-- 001_init_schema — canonical DDL for nuna-content-service.
-- Composition layer: worlds compose scenes (by name, via placements), prefabs
-- are reusable kits, sessions are runtime instances of a world. The full
-- authored documents are stored as JSON (doc_json); the rest are derived index
-- tables. Generated ids are base62, exactly 11 chars; id columns are VARCHAR(11).

-- --- worlds (mirror world.json) -----------------------------------------
CREATE TABLE IF NOT EXISTS worlds (
  id            VARCHAR(11) PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  version       VARCHAR(32) NOT NULL DEFAULT '1.0',
  comment       TEXT NULL,
  settings_json JSON NOT NULL,   -- Lua-evaluated key/values
  doc_json      JSON NOT NULL    -- full WorldComposition, lossless
);

-- Placements: a scene (named directly) included in the world, in order,
-- optionally gated behind a setting. There is NO transform here -- how a scene
-- maps into a world is game-specific and lives in params_json (opaque), not in
-- fixed pos/rot/scale columns.
CREATE TABLE IF NOT EXISTS placements (
  id           VARCHAR(11) PRIMARY KEY,
  world_id     VARCHAR(11) NOT NULL,
  ordinal      INT NOT NULL,
  scene_name   VARCHAR(255) NOT NULL,
  when_setting VARCHAR(128) NULL,
  params_json  JSON NULL,   -- game-specific placement data, opaque to the service
  INDEX idx_placements_world (world_id),
  CONSTRAINT fk_placements_world FOREIGN KEY (world_id)
    REFERENCES worlds (id) ON DELETE CASCADE
);

-- --- scenes (mirror *.scene.json) ---------------------------------------
CREATE TABLE IF NOT EXISTS scenes (
  id       VARCHAR(11) PRIMARY KEY,
  name     VARCHAR(255) NOT NULL,
  version  VARCHAR(32) NOT NULL DEFAULT '1.0',
  doc_json JSON NOT NULL   -- authored scene document, opaque to the service
);

-- --- prefab catalogs (mirror a .prefab kit) -----------------------------
-- A prefab is just a referenced kit: the service indexes catalog metadata and
-- a load reference (`kit_ref`, a URI to a .prefab SQLite / zip / local asset).
-- The kit's interior (meshes, materials, ...) is opaque to this service and is
-- the iris-engine concern -- so there are NO material/render columns here.
CREATE TABLE IF NOT EXISTS prefabs (
  id              VARCHAR(11) PRIMARY KEY,
  slug            VARCHAR(64) NOT NULL UNIQUE,
  name            VARCHAR(255) NOT NULL,
  description     TEXT NULL,
  tags_json       JSON NULL,
  kit_ref         VARCHAR(512) NULL,  -- storage reference / URI to the .prefab kit
  preview_uri     VARCHAR(512) NULL   -- optional path to a single catalog preview image
);

-- --- game-sessions (runtime instances of a world) -----------------------
-- props_json: opaque bag — callers store whatever they need
--             (e.g. { name, gameMode, maxPlayers, players, backend, … }).
--             The service never interprets this; it is passed through verbatim.
CREATE TABLE IF NOT EXISTS sessions (
  id               VARCHAR(11) PRIMARY KEY,
  world_id         VARCHAR(11) NOT NULL,
  status           VARCHAR(16) NOT NULL DEFAULT 'created',
  props_json       JSON        NOT NULL DEFAULT (JSON_OBJECT()),
  runtime_endpoint VARCHAR(512) NULL,
  created_at       BIGINT      NOT NULL,
  INDEX idx_sessions_world (world_id),
  CONSTRAINT fk_sessions_world FOREIGN KEY (world_id)
    REFERENCES worlds (id) ON DELETE CASCADE
);
