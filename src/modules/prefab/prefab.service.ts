/**
 * Prefab service — register and serve prefab catalogs.
 *
 * A prefab is a reusable kit referenced by scenes/worlds. The service indexes
 * the catalog and resolves the kit's storage reference; the optional preview
 * image is resolved through the storage adapter too.
 */

import type { AppContext } from '../../core/context';
import { CACHE_TTL } from '../../shared/constants';
import type { CreatePrefabDto } from '../../shared/dto';
import type { PrefabCatalog, PrefabId } from '../../shared/types';
import { slugify } from '../../shared/utils';
import { PrefabRepository, type PrefabSummary } from './prefab.repository';

const prefabCacheKey = (id: PrefabId) => `prefab:${id}`;

export class PrefabService {
  private readonly repo: PrefabRepository;

  constructor(private readonly ctx: AppContext) {
    this.repo = new PrefabRepository(ctx.kaga);
  }

  list(): Promise<PrefabSummary[]> {
    return this.repo.list();
  }

  async get(id: PrefabId): Promise<PrefabCatalog | null> {
    const cached = await this.ctx.cache.prefab.get<PrefabCatalog>(prefabCacheKey(id));
    if (cached) return cached;

    const prefab = await this.repo.findById(id);
    if (!prefab) return null;

    const resolved: PrefabCatalog = {
      ...prefab,
      kitRef: prefab.kitRef ? this.ctx.storage.resolve(prefab.kitRef) : undefined,
      previewUri: prefab.previewUri ? this.ctx.storage.resolve(prefab.previewUri) : undefined,
    };
    await this.ctx.cache.prefab.set(prefabCacheKey(id), resolved, CACHE_TTL.prefab);
    return resolved;
  }

  async register(dto: CreatePrefabDto): Promise<PrefabCatalog> {
    const prefab: PrefabCatalog = {
      id: '', // kaga assigns the id on create
      tenantId: dto.tenantId,
      slug: slugify(dto.slug),
      name: dto.name,
      description: dto.description,
      tags: dto.tags ?? [],
      kitRef: dto.kitRef,
      previewUri: dto.previewUri,
    };
    const saved = await this.repo.save(prefab);
    await this.ctx.cache.prefab.del(prefabCacheKey(saved.id));
    await this.ctx.eventBus.emit({ type: 'prefab.registered', prefabId: saved.id });
    return saved;
  }

  async delete(id: PrefabId): Promise<boolean> {
    const ok = await this.repo.delete(id);
    if (ok) await this.ctx.cache.prefab.del(prefabCacheKey(id));
    return ok;
  }
}
