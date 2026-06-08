-- 002_forest_scene — a "forest" authored scene and a small world that includes
-- it twice by name. The second placement is gated AND carries a game-specific
-- transform in params_json — showing the service stores it opaquely and does
-- not interpret it.

INSERT IGNORE INTO scenes (id, name, version, doc_json) VALUES
  ('forest', 'Forest', '1.0',
   '{"version":"1.0","scene":{"id":"forest","metadata":{"name":"Forest"},"entities":[]}}');

INSERT IGNORE INTO worlds (id, title, version, comment, settings_json, doc_json) VALUES
  ('forest-demo', 'Forest Demo', '1.0', 'Two placements of the forest scene',
   '{"game.clearing": true}',
   '{"version":"1.0","id":"forest-demo","title":"Forest Demo","settings":{"game.clearing":true},"world":[{"id":"plc_f1","scene":"Forest"},{"id":"plc_f2","scene":"Forest","whenSetting":"game.clearing","params":{"transform":{"position":[128,0,0],"rotation":[0,90,0]}}}]}');

INSERT IGNORE INTO placements
  (id, world_id, ordinal, scene_name, when_setting, params_json) VALUES
  ('plc_f1', 'forest-demo', 1, 'Forest', NULL,            NULL),
  ('plc_f2', 'forest-demo', 2, 'Forest', 'game.clearing', '{"transform":{"position":[128,0,0],"rotation":[0,90,0]}}');
