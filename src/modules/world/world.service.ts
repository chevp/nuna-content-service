/**
 * World service — publish and resolve world compositions.
 *
 * A world composes scenes (placements + props). `resolve` applies gating
 * against effective props to produce the active placement list the runtime
 * should load. Resolved results are cached.
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
    this.repo = new WorldRepository(ctx.kaga);
  }

  list(): Promise<WorldSummary[]> {
    return this.repo.list();
  }

  get(id: WorldId): Promise<WorldComposition | null> {
    return this.repo.findById(id);
  }

  /** Create or replace a world composition (publish world.json). */
  async publish(dto: CreateWorldDto): Promise<WorldComposition> {
    const world: WorldComposition = {
      id: dto.id ?? '', // empty = new; kaga assigns the id on create
      tenantId: dto.tenantId,
      title: dto.title,
      version: dto.version ?? DEFAULT_VERSION,
      comment: dto.comment,
      props: dto.props ?? {},
      world: dto.world.map(
        (p): Placement => ({
          id: p.id ?? base62Id(), // placement ids are local — not kaga nodes
          scene: p.scene,
          whenProp: p.whenProp,
          params: p.params,
        }),
      ),
    };
    const saved = await this.repo.save(world);
    await this.ctx.cache.world.invalidatePrefix(`world:${saved.id}:`);
    await this.ctx.eventBus.emit({ type: 'world.published', worldId: saved.id });
    return saved;
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
