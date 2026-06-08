-- 003_chunks — props scattered across neighbouring chunks to exercise spatial
-- indexing and streaming (GET /world/:id/stream?x&z&radius). chunk = floor(pos/64).

INSERT IGNORE INTO entities (id, type, pos_x, pos_y, pos_z, mesh_id, chunk_x, chunk_y) VALUES
  ('ent_crate_nw', 'prop', -10, 0, -10, 'mesh_rock', -1, -1),
  ('ent_crate_n',  'prop',  20, 0, -20, 'mesh_rock',  0, -1),
  ('ent_crate_e',  'prop',  70, 0,   5, 'mesh_rock',  1,  0),
  ('ent_crate_s',  'prop',   5, 0,  70, 'mesh_rock',  0,  1),
  ('ent_crate_se', 'prop',  70, 0,  70, 'mesh_rock',  1,  1),
  ('ent_crate_far','prop', 200, 0, 200, 'mesh_rock',  3,  3);

INSERT IGNORE INTO entity_components (entity_id, component_type, data_json) VALUES
  ('ent_crate_nw',  'tag', '{"value":"loot"}'),
  ('ent_crate_se',  'tag', '{"value":"loot"}'),
  ('ent_crate_far', 'tag', '{"value":"loot"}');
