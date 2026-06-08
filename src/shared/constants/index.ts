/** Global constants. */

export const CHUNK_SIZE = 64; // world units per chunk edge

export const CACHE_TTL = {
  chunk: 60_000,   // ms — loaded world sections
  scene: 30_000,   // ms — computed entity sets
  entity: 10_000,  // ms — hot entities
} as const;

export const ROUTES = {
  world: '/world',
  scene: '/scene',
  entity: '/entity',
  asset: '/asset',
  chunk: '/chunk',
} as const;
