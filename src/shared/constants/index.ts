/** Global constants. */

export const CACHE_TTL = {
  world: 60_000, // ms — resolved world compositions
  scene: 60_000, // ms — authored scene documents
  prefab: 300_000, // ms — prefab catalogs (rarely change)
} as const;

export const ROUTES = {
  world: '/world',
  scene: '/scene',
  prefab: '/prefab',
  session: '/session',
} as const;

export const DEFAULT_VERSION = '1.0';
