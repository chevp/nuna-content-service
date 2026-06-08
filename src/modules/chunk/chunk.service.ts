/**
 * Chunk service — world partitioning and streaming.
 *
 * Loads the entity set for a chunk (cache-first), the unit the client streams
 * as it moves through the world. Emits `chunk.loaded` so other subsystems can
 * react (e.g. realtime subscriptions).
 */

import type { AppContext } from '../../core/context';
import { CACHE_TTL } from '../../shared/constants';
import type { ChunkCoord, Entity } from '../../shared/types';
import { chunkKey } from '../../shared/utils';
import { EntityRepository } from '../entity/entity.repository';
import { chunksInRadius, worldToChunk } from './chunk.query';

const chunkCacheKey = (c: ChunkCoord) => `chunk:${chunkKey(c.chunkX, c.chunkY)}`;

export class ChunkService {
  private readonly repo: EntityRepository;

  constructor(private readonly ctx: AppContext) {
    this.repo = new EntityRepository(ctx.db);
  }

  /** Entities in a single chunk, cached. */
  async load(coord: ChunkCoord): Promise<Entity[]> {
    const key = chunkCacheKey(coord);
    const cached = await this.ctx.cache.chunk.get<Entity[]>(key);
    if (cached) return cached;

    const entities = await this.repo.findByChunks([coord]);
    await this.ctx.cache.chunk.set(key, entities, CACHE_TTL.chunk);
    await this.ctx.eventBus.emit({
      type: 'chunk.loaded',
      chunkX: coord.chunkX,
      chunkY: coord.chunkY,
    });
    return entities;
  }

  /** Entities for many chunks (streaming a region). */
  async loadMany(coords: ChunkCoord[]): Promise<Entity[]> {
    const batches = await Promise.all(coords.map((c) => this.load(c)));
    return batches.flat();
  }

  /** Stream the chunks around a world position out to `radius` chunks. */
  async streamAround(x: number, z: number, radius = 1): Promise<Entity[]> {
    return this.loadMany(chunksInRadius(worldToChunk(x, z), radius));
  }
}
