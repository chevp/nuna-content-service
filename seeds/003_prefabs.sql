-- 003_prefabs — a prefab catalog (a reusable "tree" kit) and a sample
-- game-session instancing the overworld.

INSERT IGNORE INTO prefabs (id, slug, name, description, tags_json, kit_ref) VALUES
  ('tree', 'tree', 'Tree', 'Reusable tree kit', '["nature","prop"]', 'kits/tree.prefab');

INSERT IGNORE INTO prefab_materials
  (prefab_id, material_id, name, metallic_factor, roughness_factor, base_color_factor_json) VALUES
  ('tree', 1, 'bark', 0.0, 0.9, '[0.36,0.25,0.20,1.0]'),
  ('tree', 2, 'leaf', 0.0, 0.6, '[0.20,0.55,0.20,1.0]');

INSERT IGNORE INTO prefab_previews (prefab_id, material_id, camera_preset, jpeg_ref) VALUES
  ('tree', 1, 'three-quarter', 'previews/tree_bark.jpg'),
  ('tree', 2, 'three-quarter', 'previews/tree_leaf.jpg');

-- A sample session: a runtime instance of the overworld (registry only; the
-- actual runtime is owned by iris-player / the relay daemon).
INSERT IGNORE INTO sessions (id, world_id, status, settings_json, runtime_endpoint, created_at) VALUES
  ('sess_demo', 'overworld', 'created', '{"game.show_garden": true}', NULL, 0);
