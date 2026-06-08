-- 001_initial_world — base world, core assets, and the spawn area (chunk 0,0).
-- chunk = floor(pos / 64). Everything here sits in chunk (0,0).

INSERT IGNORE INTO worlds (id, name) VALUES
  ('overworld', 'Overworld');

-- Core assets (mesh + materials). material_refs is a JSON array of asset ids.
INSERT IGNORE INTO assets (id, kind, uri, material_refs) VALUES
  ('mat_skin',    'material', 'materials/skin.json',   NULL),
  ('mat_grass',   'material', 'materials/grass.json',  NULL),
  ('mat_stone',   'material', 'materials/stone.json',  NULL),
  ('mesh_player', 'gltf',     'meshes/player.gltf',    '["mat_skin"]'),
  ('mesh_ground', 'mesh',     'meshes/ground.gltf',    '["mat_grass"]'),
  ('mesh_rock',   'mesh',     'meshes/rock.gltf',      '["mat_stone"]');

-- Spawn-area entities, all in chunk (0,0).
INSERT IGNORE INTO entities (id, type, pos_x, pos_y, pos_z, mesh_id, chunk_x, chunk_y) VALUES
  ('ent_player', 'player', 10, 0, 10, 'mesh_player', 0, 0),
  ('ent_ground', 'ground', 32, 0, 32, 'mesh_ground', 0, 0),
  ('ent_rock_1', 'prop',   40, 0, 12, 'mesh_rock',   0, 0);

-- Render-only components.
INSERT IGNORE INTO entity_components (entity_id, component_type, data_json) VALUES
  ('ent_player', 'tag',       '{"value":"spawn"}'),
  ('ent_player', 'transform', '{"rotationY":0,"scale":1}');
