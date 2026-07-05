/**
 * Prefab catalog persistence via kaga (kind='prefab').
 *
 * Indexes catalog metadata only. The `.prefab` kit itself lives in storage,
 * referenced by `kitRef`; its interior (meshes, materials, ...) is opaque to
 * this service. kaga assigns the node id, which becomes the domain PrefabId.
 */

import type { KagaClient } from '../../core/kaga/kaga-client';
import type { PrefabCatalog, PrefabId } from '../../shared/types';

export interface PrefabSummary {
  id: string;
  slug: string;
  name: string;
}

export class PrefabRepository {
  constructor(private readonly kaga: KagaClient) {}

  async list(): Promise<PrefabSummary[]> {
    const nodes = await this.kaga.listNodes('prefab');
    return nodes.map((n) => ({
      id: n.id,
      slug: typeof n.payload['slug'] === 'string' ? n.payload['slug'] : '',
      name: n.label,
    }));
  }

  async findById(id: PrefabId): Promise<PrefabCatalog | null> {
    const node = await this.kaga.getNode(id);
    if (!node) return null;
    const prefab = node.payload as unknown as PrefabCatalog;
    return { ...prefab, id: node.id };
  }

  /** Save a prefab. For new prefabs (empty id) kaga assigns the id; returns the saved entity. */
  async save(prefab: PrefabCatalog): Promise<PrefabCatalog> {
    const input = {
      kind: 'prefab',
      label: prefab.name,
      payload: prefab as unknown as Record<string, unknown>,
    };
    if (prefab.id) {
      await this.kaga.updateNode(prefab.id, input);
      return prefab;
    }
    const node = await this.kaga.createNode(input);
    return { ...prefab, id: node.id };
  }

  async delete(id: PrefabId): Promise<boolean> {
    return this.kaga.deleteNode(id);
  }
}
