/**
 * Scene service — manage scene definitions and evaluate them to entity sets.
 *
 * Definitions are persisted (filter + rules); evaluated results are cached
 * runtime-only. Flow for `GET /scene/:id`: load definition → build entity set
 * → resolve assets → cache → return.
 */

import type { AppContext } from '../../core/context';
import { QueryBuilder } from '../../core/db/mariadb';
import { CACHE_TTL } from '../../shared/constants';
import type { CreateSceneDto } from '../../shared/dto';
import type { Asset, SceneDefinition, SceneId, SceneResult } from '../../shared/types';
import { newId } from '../../shared/utils';
import { AssetService } from '../asset/asset.service';
import { EntityRepository } from '../entity/entity.repository';
import { buildScene } from './scene.builder';

interface SceneRow {
  id: string;
  name: string;
  filter_json: string;
  rules_json: string | null;
}

const sceneCacheKey = (id: SceneId) => `scene:${id}`;

export class SceneService {
  private readonly repo: EntityRepository;
  private readonly assets: AssetService;

  constructor(private readonly ctx: AppContext) {
    this.repo = new EntityRepository(ctx.db);
    this.assets = new AssetService(ctx);
  }

  async createDefinition(dto: CreateSceneDto): Promise<SceneDefinition> {
    const def: SceneDefinition = {
      id: newId('scene'),
      name: dto.name,
      filter: dto.filter,
      rules: dto.rules,
    };
    await this.ctx.db.exec(
      QueryBuilder.table('scenes').insert({
        id: def.id,
        name: def.name,
        filter_json: JSON.stringify(def.filter),
        rules_json: def.rules ? JSON.stringify(def.rules) : null,
      }),
    );
    return def;
  }

  async getDefinition(id: SceneId): Promise<SceneDefinition | null> {
    const rows = await this.ctx.db.run<SceneRow>(
      QueryBuilder.table('scenes').where('id', id).limit(1).select(),
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      filter: JSON.parse(row.filter_json),
      rules: row.rules_json ? JSON.parse(row.rules_json) : undefined,
    };
  }

  /** Evaluate a scene to its entity set + resolved assets (cache-first). */
  async evaluate(id: SceneId): Promise<SceneResult | null> {
    const cached = await this.ctx.cache.scene.get<SceneResult>(sceneCacheKey(id));
    if (cached) return cached;

    const def = await this.getDefinition(id);
    if (!def) return null;

    const entities = await buildScene(def, { repo: this.repo });
    const meshIds = [...new Set(entities.map((e) => e.meshId).filter((m): m is string => !!m))];
    const assets: Asset[] = await this.assets.getMany(meshIds);

    const result: SceneResult = { scene: id, entities, assets, computedAt: 0 };
    await this.ctx.cache.scene.set(sceneCacheKey(id), result, CACHE_TTL.scene);
    return result;
  }

  /** Update a scene's membership rules and invalidate its cached result. */
  async updateMembership(id: SceneId, rules: SceneDefinition['rules']): Promise<boolean> {
    const affected = await this.ctx.db.exec(
      QueryBuilder.table('scenes')
        .where('id', id)
        .update({ rules_json: rules ? JSON.stringify(rules) : null }),
    );
    await this.ctx.cache.scene.del(sceneCacheKey(id));
    await this.ctx.eventBus.emit({ type: 'scene.changed', sceneId: id });
    return affected > 0;
  }
}
