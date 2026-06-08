/**
 * Entity service — create/update/delete entities, component handling
 * (render-only), and transform updates.
 *
 * Every mutation: persist → emit a domain event → invalidate the affected
 * caches. The event drives realtime pushes; cache invalidation keeps scene /
 * chunk results fresh. This is the runtime-editing flow.
 */

import type { AppContext } from '../../core/context';
import { CACHE_TTL } from '../../shared/constants';
import type { CreateEntityDto, UpdateEntityDto } from '../../shared/dto';
import type { Entity, EntityId } from '../../shared/types';
import { CHUNK_SIZE } from '../../shared/constants';
import { chunkKey, newId } from '../../shared/utils';
import { EntityRepository } from './entity.repository';

const entityCacheKey = (id: EntityId) => `entity:${id}`;

export class EntityService {
  private readonly repo: EntityRepository;

  constructor(private readonly ctx: AppContext) {
    this.repo = new EntityRepository(ctx.db);
  }

  private chunkFor(x: number, y: number): { chunkX: number; chunkY: number } {
    return { chunkX: Math.floor(x / CHUNK_SIZE), chunkY: Math.floor(y / CHUNK_SIZE) };
  }

  async get(id: EntityId): Promise<Entity | null> {
    const cached = await this.ctx.cache.entity.get<Entity>(entityCacheKey(id));
    if (cached) return cached;
    const entity = await this.repo.findById(id);
    if (entity) await this.ctx.cache.entity.set(entityCacheKey(id), entity, CACHE_TTL.entity);
    return entity;
  }

  async create(dto: CreateEntityDto): Promise<Entity> {
    const { chunkX, chunkY } = this.chunkFor(dto.posX, dto.posZ);
    const entity: Entity = {
      id: newId('ent'),
      type: dto.type,
      posX: dto.posX,
      posY: dto.posY,
      posZ: dto.posZ,
      meshId: dto.meshId ?? null,
      chunkX,
      chunkY,
      components: dto.components ?? [],
    };
    await this.repo.insert(entity);
    await this.invalidate(entity);
    await this.ctx.eventBus.emit({ type: 'entity.created', entityId: entity.id });
    return entity;
  }

  async update(id: EntityId, dto: UpdateEntityDto): Promise<Entity | null> {
    const current = await this.repo.findById(id);
    if (!current) return null;

    const next: Entity = {
      ...current,
      posX: dto.posX ?? current.posX,
      posY: dto.posY ?? current.posY,
      posZ: dto.posZ ?? current.posZ,
      meshId: dto.meshId === undefined ? current.meshId : dto.meshId,
      components: dto.components ?? current.components,
    };
    const { chunkX, chunkY } = this.chunkFor(next.posX, next.posZ);
    next.chunkX = chunkX;
    next.chunkY = chunkY;

    await this.repo.update(next);
    await this.invalidate(next, current);
    await this.ctx.eventBus.emit({
      type: 'entity.updated',
      entityId: id,
      chunkX: next.chunkX,
      chunkY: next.chunkY,
    });
    return next;
  }

  async delete(id: EntityId): Promise<boolean> {
    const current = await this.repo.findById(id);
    if (!current) return false;
    await this.repo.delete(id);
    await this.invalidate(current);
    await this.ctx.eventBus.emit({ type: 'entity.deleted', entityId: id });
    return true;
  }

  /** Drop the entity from every cache domain it can affect. */
  private async invalidate(entity: Entity, previous?: Entity): Promise<void> {
    await this.ctx.cache.entity.del(entityCacheKey(entity.id));
    const chunks = new Set([chunkKey(entity.chunkX, entity.chunkY)]);
    if (previous) chunks.add(chunkKey(previous.chunkX, previous.chunkY));
    for (const ck of chunks) await this.ctx.cache.chunk.del(`chunk:${ck}`);
    // Scenes are derived; any entity change may alter a computed set.
    await this.ctx.cache.scene.invalidatePrefix('scene:');
  }
}
