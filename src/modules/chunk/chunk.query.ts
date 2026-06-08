/**
 * Spatial query helpers for world partitioning.
 *
 * Pure functions: translate world-space positions and radii into the set of
 * chunk coordinates that must be loaded. Keeps streaming logic deterministic
 * and testable, independent of storage.
 */

import { CHUNK_SIZE } from '../../shared/constants';
import type { ChunkCoord } from '../../shared/types';

export const worldToChunk = (x: number, z: number): ChunkCoord => ({
  chunkX: Math.floor(x / CHUNK_SIZE),
  chunkY: Math.floor(z / CHUNK_SIZE),
});

/** All chunk coords within `radius` chunks (Chebyshev) of a center chunk. */
export function chunksInRadius(center: ChunkCoord, radius: number): ChunkCoord[] {
  const out: ChunkCoord[] = [];
  for (let dx = -radius; dx <= radius; dx += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      out.push({ chunkX: center.chunkX + dx, chunkY: center.chunkY + dy });
    }
  }
  return out;
}

/** Chunks covering an axis-aligned world-space box (min/max on X/Z). */
export function chunksForBox(
  minX: number,
  minZ: number,
  maxX: number,
  maxZ: number,
): ChunkCoord[] {
  const min = worldToChunk(minX, minZ);
  const max = worldToChunk(maxX, maxZ);
  const out: ChunkCoord[] = [];
  for (let cx = min.chunkX; cx <= max.chunkX; cx += 1) {
    for (let cy = min.chunkY; cy <= max.chunkY; cy += 1) {
      out.push({ chunkX: cx, chunkY: cy });
    }
  }
  return out;
}
