-- 003_prefabs — a prefab catalog (a reusable "tree" kit) and a sample
-- game-session instancing the overworld.

INSERT IGNORE INTO prefabs (id, slug, name, description, tags_json, kit_ref, preview_uri) VALUES
  ('tree', 'tree', 'Tree', 'Reusable tree kit', '["nature","prop"]', 'kits/tree.prefab', 'previews/tree.jpg');

-- A sample session: a runtime instance of the overworld (registry only; the
-- actual runtime is owned by iris-player / the relay daemon).
INSERT IGNORE INTO sessions (id, world_id, status, settings_json, runtime_endpoint, created_at) VALUES
  ('sess_demo', 'overworld', 'created', '{"game.show_garden": true}', NULL, 0);
