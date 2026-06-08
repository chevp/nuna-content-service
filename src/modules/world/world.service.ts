/**
 * World service — the module kern.
 *
 * Sits at the top of the data flow (Gateway → World → Entity/Scene/Chunk →
 * Cache → DB). It owns world state and chunk mapping, and exposes entity CRUD
 * by delegating to the entity and chunk services. Clients talk to the world;
 * the world coordinates the rest.
 */

import type { AppContext } from '../../core/context';
import type { CreateEntityDto, UpdateEntityDto } from '../../shared/dto';
import type { Entity, EntityId, WorldId, WorldState } from '../../shared/types';
import { ChunkService } from '../chunk/chunk.service';
import { EntityService } from '../entity/entity.service';
import { WorldRepository } from './world.repository';

export class WorldService {
  private readonly repo: WorldRepository;
  private readonly entities: EntityService;
  private readonly chunks: ChunkService;

  constructor(private readonly ctx: AppContext) {
    this.repo = new WorldRepository(ctx.db);
    this.entities = new EntityService(ctx);
    this.chunks = new ChunkService(ctx);
  }

  // --- world state -------------------------------------------------------
  async getState(id: WorldId): Promise<WorldState | null> {
    return this.repo.findById(id);
  }

  async ensureWorld(id: WorldId, name: string): Promise<void> {
    await this.repo.upsert({ id, name });
  }

  // --- chunk mapping / streaming ----------------------------------------
  /** Stream the world around a position (chunk-based partitioning). */
  async stream(x: number, z: number, radius = 1): Promise<Entity[]> {
    return this.chunks.streamAround(x, z, radius);
  }

  // --- entity CRUD façade ------------------------------------------------
  getEntity(id: EntityId): Promise<Entity | null> {
    return this.entities.get(id);
  }

  createEntity(dto: CreateEntityDto): Promise<Entity> {
    return this.entities.create(dto);
  }

  updateEntity(id: EntityId, dto: UpdateEntityDto): Promise<Entity | null> {
    return this.entities.update(id, dto);
  }

  deleteEntity(id: EntityId): Promise<boolean> {
    return this.entities.delete(id);
  }
}
