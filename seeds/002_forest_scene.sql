-- 002_forest_scene — a "forest" scene plus the trees it selects.
-- The scene is a chunk-based QUERY over chunks (2,2) and (2,3); it is not a
-- stored copy of those entities. Trees live in chunk-space x=128..191 (chunk 2),
-- z=128..191 (chunk 2) and z=192..255 (chunk 3).

INSERT IGNORE INTO assets (id, kind, uri, material_refs) VALUES
  ('mat_bark', 'material', 'materials/bark.json', NULL),
  ('mat_leaf', 'material', 'materials/leaf.json', NULL),
  ('mesh_tree', 'gltf',    'meshes/tree.gltf',    '["mat_bark","mat_leaf"]');

-- Scene definition: chunk-based filter, limited to 100 entities.
INSERT IGNORE INTO scenes (id, name, filter_json, rules_json) VALUES
  ('scene_forest', 'forest',
   '{"kind":"chunk","chunks":[{"chunkX":2,"chunkY":2},{"chunkX":2,"chunkY":3}]}',
   '[{"op":"limit","value":100}]');

-- Trees the forest scene resolves to.
INSERT IGNORE INTO entities (id, type, pos_x, pos_y, pos_z, mesh_id, chunk_x, chunk_y) VALUES
  ('ent_tree_1', 'tree', 130, 0, 140, 'mesh_tree', 2, 2),
  ('ent_tree_2', 'tree', 150, 0, 150, 'mesh_tree', 2, 2),
  ('ent_tree_3', 'tree', 168, 0, 132, 'mesh_tree', 2, 2),
  ('ent_tree_4', 'tree', 140, 0, 200, 'mesh_tree', 2, 3),
  ('ent_tree_5', 'tree', 160, 0, 230, 'mesh_tree', 2, 3);

INSERT IGNORE INTO entity_components (entity_id, component_type, data_json) VALUES
  ('ent_tree_1', 'tag', '{"value":"forest"}'),
  ('ent_tree_2', 'tag', '{"value":"forest"}'),
  ('ent_tree_3', 'tag', '{"value":"forest"}'),
  ('ent_tree_4', 'tag', '{"value":"forest"}'),
  ('ent_tree_5', 'tag', '{"value":"forest"}');
