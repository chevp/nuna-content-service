-- 001_initial_world — two authored scenes and the "overworld" composition.
-- Placements reference scenes BY NAME (no palette); the garden placement is
-- gated behind the setting `game.show_garden`.

-- Authored scenes (doc_json is the engine-defined scene body; kept minimal).
INSERT IGNORE INTO scenes (id, name, version, doc_json) VALUES
  ('main', 'Main', '1.0',
   '{"version":"1.0","scene":{"id":"main","metadata":{"name":"Main"},"entities":[]}}'),
  ('garden', 'Garden', '1.0',
   '{"version":"1.0","scene":{"id":"garden","metadata":{"name":"Garden"},"entities":[]}}');

-- World composition. Placements name scenes directly ("Main", "Garden").
INSERT IGNORE INTO worlds (id, title, version, comment, settings_json, doc_json) VALUES
  ('overworld', 'Overworld', '1.0', 'Starter world',
   '{"game.show_garden": false}',
   '{"version":"1.0","id":"overworld","title":"Overworld","comment":"Starter world","settings":{"game.show_garden":false},"world":[{"id":"plc_main","scene":"Main","position":[0,0,0]},{"id":"plc_garden","scene":"Garden","position":[20,0,0],"whenSetting":"game.show_garden"}]}');

-- Derived placement index.
INSERT IGNORE INTO placements
  (id, world_id, ordinal, scene_name, pos_x, pos_y, pos_z, when_setting) VALUES
  ('plc_main',   'overworld', 1, 'Main',    0, 0, 0, NULL),
  ('plc_garden', 'overworld', 2, 'Garden', 20, 0, 0, 'game.show_garden');
