-- 001_init_schema — canonical DDL for nuna-content-service.
-- Flat, chunk-partitioned world model. Scenes are queries, not stored copies.

CREATE TABLE IF NOT EXISTS worlds (
  id   VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS entities (
  id       VARCHAR(64) PRIMARY KEY,
  type     VARCHAR(64) NOT NULL,
  pos_x    DOUBLE NOT NULL DEFAULT 0,
  pos_y    DOUBLE NOT NULL DEFAULT 0,
  pos_z    DOUBLE NOT NULL DEFAULT 0,
  mesh_id  VARCHAR(64) NULL,
  chunk_x  INT NOT NULL,
  chunk_y  INT NOT NULL,
  INDEX idx_entities_chunk (chunk_x, chunk_y),
  INDEX idx_entities_type (type)
);

-- Render-only components, stored as JSON keyed by entity + type.
CREATE TABLE IF NOT EXISTS entity_components (
  entity_id      VARCHAR(64) NOT NULL,
  component_type VARCHAR(64) NOT NULL,
  data_json      JSON NOT NULL,
  PRIMARY KEY (entity_id, component_type),
  CONSTRAINT fk_components_entity FOREIGN KEY (entity_id)
    REFERENCES entities (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assets (
  id            VARCHAR(64) PRIMARY KEY,
  kind          VARCHAR(32) NOT NULL,
  uri           VARCHAR(1024) NOT NULL,
  material_refs JSON NULL
);

-- Scene DEFINITIONS only (filter + rules). Results are computed at runtime
-- and live in the cache, never persisted here.
CREATE TABLE IF NOT EXISTS scenes (
  id          VARCHAR(64) PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  filter_json JSON NOT NULL,
  rules_json  JSON NULL
);
