/**
 * Asset service — resolves meshes, material refs, and file paths (gltf/bin).
 *
 * Asset rows live in the DB; the concrete file location is resolved through
 * the storage adapter so callers get a fetchable URI without knowing the
 * backing driver (local fs today, object storage later).
 */

import type { AppContext } from '../../core/context';
import { QueryBuilder } from '../../core/db/mariadb';
import type { Asset, AssetId } from '../../shared/types';

interface AssetRow {
  id: string;
  kind: Asset['kind'];
  uri: string;
  material_refs: string | null;
}

export class AssetService {
  constructor(private readonly ctx: AppContext) {}

  private resolve(row: AssetRow): Asset {
    return {
      id: row.id,
      kind: row.kind,
      uri: this.ctx.storage.resolve(row.uri),
      materialRefs: row.material_refs ? (JSON.parse(row.material_refs) as string[]) : undefined,
    };
  }

  async get(id: AssetId): Promise<Asset | null> {
    const rows = await this.ctx.db.run<AssetRow>(
      QueryBuilder.table('assets').where('id', id).limit(1).select(),
    );
    return rows.length ? this.resolve(rows[0]) : null;
  }

  /** Batch resolution — used when a scene/chunk references many meshes. */
  async getMany(ids: AssetId[]): Promise<Asset[]> {
    if (ids.length === 0) return [];
    const rows = await this.ctx.db.run<AssetRow>(
      QueryBuilder.table('assets').whereIn('id', ids).select(),
    );
    return rows.map((r) => this.resolve(r));
  }

  /** Resolve the mesh + its referenced materials for an entity's meshId. */
  async resolveMesh(meshId: AssetId): Promise<{ mesh: Asset; materials: Asset[] } | null> {
    const mesh = await this.get(meshId);
    if (!mesh) return null;
    const materials = mesh.materialRefs ? await this.getMany(mesh.materialRefs) : [];
    return { mesh, materials };
  }
}
