import { describe, expect, it } from 'vitest';
import { isTruthy, resolveWorld } from '../src/modules/world/world.resolve';
import type { WorldComposition } from '../src/shared/types';

const world: WorldComposition = {
  id: 'overworld',
  title: 'Overworld',
  version: '1.0',
  settings: { 'game.show_garden': false },
  world: [
    { id: 'plc_main', scene: 'Main' },
    { id: 'plc_garden', scene: 'Garden', whenSetting: 'game.show_garden' },
  ],
};

describe('isTruthy', () => {
  it('treats falsey settings (false/0/""/"false") as gates off', () => {
    for (const v of [false, 0, '', 'false', '0', null, undefined]) {
      expect(isTruthy(v)).toBe(false);
    }
  });
  it('treats real values as gates on', () => {
    for (const v of [true, 1, 'yes', 'true']) {
      expect(isTruthy(v)).toBe(true);
    }
  });
});

describe('resolveWorld', () => {
  it('drops gated placements when the setting is off', () => {
    const r = resolveWorld(world);
    expect(r.placements.map((p) => p.id)).toEqual(['plc_main']);
  });

  it('includes gated placements when an override turns the setting on', () => {
    const r = resolveWorld(world, { 'game.show_garden': true });
    expect(r.placements.map((p) => p.id)).toEqual(['plc_main', 'plc_garden']);
    // placements name their scene directly
    expect(r.placements[1].scene).toBe('Garden');
  });
});
