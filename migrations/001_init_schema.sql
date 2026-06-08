-- 001_init_schema — canonical DDL for nuna-content-service.
-- Composition layer: worlds compose scenes (by name, via placements), prefabs
-- are reusable kits, sessions are runtime instances of a world. The full
-- authored documents are stored as JSON (doc_json); the rest are derived index
-- tables. Generated ids are base62 (12 chars); id columns are VARCHAR(24) to
-- leave headroom for caller-supplied ids.

-- --- worlds (mirror world.json) -----------------------------------------
CREATE TABLE IF NOT EXISTS worlds (
  id            VARCHAR(24) PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  version       VARCHAR(32) NOT NULL DEFAULT '1.0',
  comment       TEXT NULL,
  settings_json JSON NOT NULL,   -- Lua-evaluated key/values
  doc_json      JSON NOT NULL    -- full WorldComposition, lossless
);

-- Placements: a scene (named directly) positioned into the world, optionally
-- gated behind a setting.
CREATE TABLE IF NOT EXISTS placements (
  id           VARCHAR(24) PRIMARY KEY,
  world_id     VARCHAR(24) NOT NULL,
  ordinal      INT NOT NULL,
  scene_name   VARCHAR(255) NOT NULL,
  pos_x        DOUBLE NULL,
  pos_y        DOUBLE NULL,
  pos_z        DOUBLE NULL,
  rot_x        DOUBLE NULL,
  rot_y        DOUBLE NULL,
  rot_z        DOUBLE NULL,
  scale_x      DOUBLE NULL,
  scale_y      DOUBLE NULL,
  scale_z      DOUBLE NULL,
  when_setting VARCHAR(128) NULL,
  INDEX idx_placements_world (world_id),
  CONSTRAINT fk_placements_world FOREIGN KEY (world_id)
    REFERENCES worlds (id) ON DELETE CASCADE
);

-- --- scenes (mirror *.scene.json) ---------------------------------------
CREATE TABLE IF NOT EXISTS scenes (
  id       VARCHAR(24) PRIMARY KEY,
  name     VARCHAR(255) NOT NULL,
  version  VARCHAR(32) NOT NULL DEFAULT '1.0',
  doc_json JSON NOT NULL   -- authored scene document, opaque to the service
);

-- --- prefab catalogs (mirror a .prefab kit) -----------------------------
CREATE TABLE IF NOT EXISTS prefabs (
  id          VARCHAR(24) PRIMARY KEY,
  slug        VARCHAR(64) NOT NULL UNIQUE,
  name        VARCHAR(255) NOT NULL,
  description TEXT NULL,
  tags_json   JSON NULL,
  kit_ref     VARCHAR(512) NULL   -- storage reference to the .prefab kit blob
);

CREATE TABLE IF NOT EXISTS prefab_materials (
  prefab_id              VARCHAR(24) NOT NULL,
  material_id            INT NOT NULL,
  name                   VARCHAR(255) NOT NULL,
  metallic_factor        DOUBLE NULL,
  roughness_factor       DOUBLE NULL,
  base_color_factor_json JSON NULL,
  PRIMARY KEY (prefab_id, material_id),
  CONSTRAINT fk_prefab_materials FOREIGN KEY (prefab_id)
    REFERENCES prefabs (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS prefab_previews (
  prefab_id     VARCHAR(24) NOT NULL,
  material_id   INT NULL,
  camera_preset VARCHAR(64) NOT NULL,
  jpeg_ref      VARCHAR(512) NULL,   -- storage reference to the cached frame
  INDEX idx_prefab_previews (prefab_id),
  CONSTRAINT fk_prefab_previews FOREIGN KEY (prefab_id)
    REFERENCES prefabs (id) ON DELETE CASCADE
);

-- --- game-sessions (runtime instances of a world) -----------------------
CREATE TABLE IF NOT EXISTS sessions (
  id               VARCHAR(24) PRIMARY KEY,
  world_id         VARCHAR(24) NOT NULL,
  status           VARCHAR(16) NOT NULL DEFAULT 'created',
  settings_json    JSON NOT NULL,
  runtime_endpoint VARCHAR(512) NULL,
  created_at       BIGINT NOT NULL,
  INDEX idx_sessions_world (world_id),
  CONSTRAINT fk_sessions_world FOREIGN KEY (world_id)
    REFERENCES worlds (id) ON DELETE CASCADE
);
