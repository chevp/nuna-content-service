-- 001_initial_world — sample data: scenes, worlds, a prefab and a session.

-- --- scenes -----------------------------------------------------------------

INSERT IGNORE INTO scenes (id, tenant_id, name, version, doc_json) VALUES
  ('main',   'default', 'Main',   '1.0',
   '{"version":"1.0","scene":{"id":"main","metadata":{"name":"Main"},"entities":[]}}'),
  ('garden', 'default', 'Garden', '1.0',
   '{"version":"1.0","scene":{"id":"garden","metadata":{"name":"Garden"},"entities":[]}}'),
  ('forest', 'default', 'Forest', '1.0',
   '{"version":"1.0","scene":{"id":"forest","metadata":{"name":"Forest"},"entities":[]}}');

-- --- worlds -----------------------------------------------------------------

-- Overworld: garden placement gated behind game.show_garden.
INSERT IGNORE INTO worlds (id, tenant_id, title, version, comment, props_json, doc_json) VALUES
  ('overworld', 'default', 'Overworld', '1.0', 'Starter world',
   '{"game.show_garden": false}',
   '{"version":"1.0","id":"overworld","tenantId":"default","title":"Overworld","comment":"Starter world","props":{"game.show_garden":false},"world":[{"id":"plc_main","scene":"Main"},{"id":"plc_garden","scene":"Garden","whenSetting":"game.show_garden"}]}');

-- Forest Demo: same scene placed twice; second placement gated and carries a
-- game-specific transform in params_json (opaque to the service).
INSERT IGNORE INTO worlds (id, tenant_id, title, version, comment, props_json, doc_json) VALUES
  ('forest-demo', 'default', 'Forest Demo', '1.0', 'Two placements of the forest scene',
   '{"game.clearing": true}',
   '{"version":"1.0","id":"forest-demo","tenantId":"default","title":"Forest Demo","props":{"game.clearing":true},"world":[{"id":"plc_f1","scene":"Forest"},{"id":"plc_f2","scene":"Forest","whenSetting":"game.clearing","params":{"transform":{"position":[128,0,0],"rotation":[0,90,0]}}}]}');

-- --- placements -------------------------------------------------------------

INSERT IGNORE INTO placements
  (id, world_id, ordinal, scene_name, when_setting, params_json) VALUES
  ('plc_main',   'overworld',   1, 'Main',   NULL,               NULL),
  ('plc_garden', 'overworld',   2, 'Garden', 'game.show_garden', NULL),
  ('plc_f1',     'forest-demo', 1, 'Forest', NULL,               NULL),
  ('plc_f2',     'forest-demo', 2, 'Forest', 'game.clearing',    '{"transform":{"position":[128,0,0],"rotation":[0,90,0]}}');

-- --- prefabs ----------------------------------------------------------------

INSERT IGNORE INTO prefabs (id, tenant_id, slug, name, description, tags_json, kit_ref, preview_uri) VALUES
  ('tree', 'default', 'tree', 'Tree', 'Reusable tree kit', '["nature","prop"]', 'kits/tree.prefab', 'previews/tree.jpg');

-- --- sessions ---------------------------------------------------------------

INSERT IGNORE INTO sessions (id, tenant_id, world_id, status, props_json, runtime_endpoint, created_at) VALUES
  ('sess_demo', 'default', 'overworld', 'created', '{"gameMode":"sandbox"}', NULL, 0);
