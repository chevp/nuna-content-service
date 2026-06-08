/**
 * Scene service — store and serve authored scene documents.
 *
 * A scene is an authored unit (entities + lights + materials), stored as an
 * opaque document and referenced by worlds through their palette. The service
 * does not interpret scene internals — that is the engine's job.
 */

import type { AppContext } from '../../core/context';
import { CACHE_TTL, DEFAULT_VERSION } from '../../shared/constants';
import type { CreateSceneDto, UpdateSceneDto } from '../../shared/dto';
import type { SceneId, SceneRecord } from '../../shared/types';
import { base62Id } from '../../shared/utils';
import { SceneRepository, type SceneSummary } from './scene.repository';

const sceneCacheKey = (id: SceneId) => `scene:${id}`;

export class SceneService {
  private readonly repo: SceneRepository;

  constructor(private readonly ctx: AppContext) {
    this.repo = new SceneRepository(ctx.db);
  }

  list(): Promise<SceneSummary[]> {
    return this.repo.list();
  }

  async get(id: SceneId): Promise<SceneRecord | null> {
    const cached = await this.ctx.cache.scene.get<SceneRecord>(sceneCacheKey(id));
    if (cached) return cached;
    const scene = await this.repo.findById(id);
    if (scene) await this.ctx.cache.scene.set(sceneCacheKey(id), scene, CACHE_TTL.scene);
    return scene;
  }

  async create(dto: CreateSceneDto): Promise<SceneRecord> {
    const scene: SceneRecord = {
      id: dto.id ?? base62Id(),
      name: dto.name,
      version: dto.version ?? DEFAULT_VERSION,
      doc: dto.doc,
    };
    await this.save(scene);
    return scene;
  }

  async update(id: SceneId, dto: UpdateSceneDto): Promise<SceneRecord | null> {
    const current = await this.repo.findById(id);
    if (!current) return null;
    const next: SceneRecord = {
      id,
      name: dto.name ?? current.name,
      version: dto.version ?? current.version,
      doc: dto.doc ?? current.doc,
    };
    await this.save(next);
    return next;
  }

  async delete(id: SceneId): Promise<boolean> {
    const ok = await this.repo.delete(id);
    if (ok) await this.ctx.cache.scene.del(sceneCacheKey(id));
    return ok;
  }

  private async save(scene: SceneRecord): Promise<void> {
    await this.repo.save(scene);
    await this.ctx.cache.scene.del(sceneCacheKey(scene.id));
    await this.ctx.eventBus.emit({ type: 'scene.updated', sceneId: scene.id });
  }
}
