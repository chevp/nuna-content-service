import { describe, expect, it } from 'vitest';
import { chunksForBox, chunksInRadius, worldToChunk } from '../src/modules/chunk/chunk.query';
import { CHUNK_SIZE } from '../src/shared/constants';

describe('chunk.query', () => {
  it('maps world position to chunk coords', () => {
    expect(worldToChunk(0, 0)).toEqual({ chunkX: 0, chunkY: 0 });
    expect(worldToChunk(CHUNK_SIZE, CHUNK_SIZE)).toEqual({ chunkX: 1, chunkY: 1 });
    expect(worldToChunk(-1, -1)).toEqual({ chunkX: -1, chunkY: -1 });
  });

  it('returns a square ring of chunks within radius', () => {
    const chunks = chunksInRadius({ chunkX: 0, chunkY: 0 }, 1);
    expect(chunks).toHaveLength(9); // (2*1+1)^2
  });

  it('covers a box across multiple chunks', () => {
    const chunks = chunksForBox(0, 0, CHUNK_SIZE * 2, CHUNK_SIZE);
    expect(chunks.length).toBeGreaterThanOrEqual(6);
  });
});
