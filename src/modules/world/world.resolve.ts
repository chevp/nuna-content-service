/**
 * Pure world-resolution: given a world composition and an effective settings
 * map, compute the ACTIVE placements (gating applied) with their scene palette
 * references resolved. This is the "compose" step — no IO, fully testable.
 */

import type { Placement, ResolvedWorld, WorldComposition } from '../../shared/types';

/** Lua-ish truthiness for a setting value (settings are JSON key/values). */
export function isTruthy(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value !== '' && value !== 'false' && value !== '0';
  return Boolean(value);
}

/** Is a placement active under the given settings? Gated placements need a truthy setting. */
export function isPlacementActive(p: Placement, settings: Record<string, unknown>): boolean {
  if (!p.whenSetting) return true;
  return isTruthy(settings[p.whenSetting]);
}

/**
 * Resolve a world against optional per-request setting overrides. Returns only
 * the active placements, each annotated with the palette `sceneRef` it points at.
 */
export function resolveWorld(
  world: WorldComposition,
  overrides: Record<string, unknown> = {},
): ResolvedWorld {
  const settings = { ...world.settings, ...overrides };
  const placements = world.world
    .filter((p) => isPlacementActive(p, settings))
    .map((p) => ({ ...p, sceneRef: world.scenes[p.scene] ?? p.scene }));

  return { world: world.id, title: world.title, settings, placements };
}
