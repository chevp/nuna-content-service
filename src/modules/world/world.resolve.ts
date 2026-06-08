/**
 * Pure world-resolution: given a world composition and effective props
 * overrides, compute the ACTIVE placements (gating applied). Each placement
 * names its scene directly. This is the "compose" step — no IO, fully testable.
 */

import type { Placement, ResolvedWorld, WorldComposition } from '../../shared/types';

/** Lua-ish truthiness for a prop value (props are JSON key/values). */
export function isTruthy(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value !== '' && value !== 'false' && value !== '0';
  return Boolean(value);
}

/** Is a placement active under the given props? Gated placements need a truthy prop. */
export function isPlacementActive(p: Placement, props: Record<string, unknown>): boolean {
  if (!p.whenSetting) return true;
  return isTruthy(props[p.whenSetting]);
}

/**
 * Resolve a world against optional per-request props overrides. Returns only
 * the active placements (gating applied); each names the scene it places.
 */
export function resolveWorld(
  world: WorldComposition,
  overrides: Record<string, unknown> = {},
): ResolvedWorld {
  const props = { ...world.props, ...overrides };
  const placements = world.world.filter((p) => isPlacementActive(p, props));

  return { world: world.id, title: world.title, props, placements };
}
