-- 002_forest_scene — a "forest" authored scene and a small world that places
-- it twice (a clearing variant gated behind a setting).

INSERT IGNORE INTO scenes (id, name, version, doc_json) VALUES
  ('forest', 'Forest', '1.0',
   '{"version":"1.0","scene":{"id":"forest","metadata":{"name":"Forest"},"entities":[]}}');

INSERT IGNORE INTO worlds (id, title, version, comment, settings_json, doc_json) VALUES
  ('forest-demo', 'Forest Demo', '1.0', 'Two placements of the forest scene',
   '{"game.clearing": true}',
   '{"version":"1.0","id":"forest-demo","title":"Forest Demo","settings":{"game.clearing":true},"scenes":{"forest":"forest"},"world":[{"id":"plc_f1","scene":"forest","position":[0,0,0]},{"id":"plc_f2","scene":"forest","position":[128,0,0],"rotation":[0,90,0],"whenSetting":"game.clearing"}]}');

INSERT IGNORE INTO world_scenes (world_id, scene_key, scene_ref) VALUES
  ('forest-demo', 'forest', 'forest');

INSERT IGNORE INTO placements
  (id, world_id, ordinal, scene_key, pos_x, pos_y, pos_z, rot_x, rot_y, rot_z, when_setting) VALUES
  ('plc_f1', 'forest-demo', 1, 'forest',   0, 0, 0, NULL, NULL, NULL, NULL),
  ('plc_f2', 'forest-demo', 2, 'forest', 128, 0, 0, 0,    90,   0,    'game.clearing');
