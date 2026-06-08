/**
 * World service — publish and resolve world compositions.
 *
 * A world composes scenes (palette + placements + props). `resolve` applies
 * gating against effective props to produce the active placement list the
 * runtime should load. Resolved results are cached.
 */

import type { AppContext } from '../../core/context';
import { CACHE_TTL, DEFAULT_VERSION } from '../../shared/constants';
import type { CreateWorldDto, UpdateWorldDto } from '../../shared/dto';
import type { Placement, ResolvedWorld, WorldComposition, WorldId } from '../../shared/types';
import { base62Id } from '../../shared/utils';
import { WorldRepository, type WorldSummary } from './world.repository';
import { resolveWorld } from './world.resolve';

const resolvedKey = (id: WorldId, overrides: Record<string, unknown>) =>
  `world:${id}:${JSON.stringify(overrides)}`;

export class WorldService {
  private readonly repo: WorldRepository;

  constructor(private readonly ctx: AppContext) {
    this.repo = new WorldRepository(ctx.db);
  }

  list(): Promise<WorldSummary[]> {
    return this.repo.list();
  }

  get(id: WorldId): Promise<WorldComposition | null> {
    return this.repo.findById(id);
  }

  /** Create or replace a world composition (publish world.json). */
  async publish(dto: CreateWorldDto): Promise<WorldComposition> {
    const id = dto.id ?? base62Id();
    const world: WorldComposition = {
      id,
      title: dto.title,
      version: dto.version ?? DEFAULT_VERSION,
      comment: dto.comment,
      props: dto.props ?? {},
      world: dto.world.map(
        (p): Placement => ({
          id: p.id ?? base62Id(),
          scene: p.scene,
          whenSetting: p.whenSetting,
          params: p.params,
        }),
      ),
    };
    await this.repo.save(world);
    await this.ctx.cache.world.invalidatePrefix(`world:${id}:`);
    await this.ctx.eventBus.emit({ type: 'world.published', worldId: id });
    return world;
  }

  async update(id: WorldId, dto: UpdateWorldDto): Promise<WorldComposition | null> {
    const current = await this.repo.findById(id);
    if (!current) return null;
    return this.publish({ ...current, ...dto, id });
  }

  async delete(id: WorldId): Promise<boolean> {
    const ok = await this.repo.delete(id);
    if (ok) await this.ctx.cache.world.invalidatePrefix(`world:${id}:`);
    return ok;
  }

  /** Resolve a world against per-request setting overrides (cache-first). */
  async resolve(
    id: WorldId,
    overrides: Record<string, unknown> = {},
  ): Promise<ResolvedWorld | null> {
    const key = resolvedKey(id, overrides);
    const cached = await this.ctx.cache.world.get<ResolvedWorld>(key);
    if (cached) return cached;

    const world = await this.repo.findById(id);
    if (!world) return null;

    const resolved = resolveWorld(world, overrides);
    await this.ctx.cache.world.set(key, resolved, CACHE_TTL.world);
    return resolved;
  }
}
