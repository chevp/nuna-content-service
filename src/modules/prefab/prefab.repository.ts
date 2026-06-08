/**
 * Prefab catalog persistence.
 *
 * Indexes catalog metadata (`prefabs`) plus the material and preview-slot rows
 * (`prefab_materials`, `prefab_previews`). The heavy `.prefab` kit itself lives
 * in storage, referenced by `kit_ref`.
 */

import type { Database } from '../../core/db/mariadb';
import { QueryBuilder } from '../../core/db/mariadb';
import type { PrefabCatalog, PrefabId, PrefabMaterial, PrefabPreview } from '../../shared/types';

interface PrefabRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tags_json: string | null;
  kit_ref: string | null;
}

interface MaterialRow {
  material_id: number;
  name: string;
  metallic_factor: number | null;
  roughness_factor: number | null;
  base_color_factor_json: string | null;
}

interface PreviewRow {
  material_id: number | null;
  camera_preset: string;
  jpeg_ref: string | null;
}

export interface PrefabSummary {
  id: string;
  slug: string;
  name: string;
}

export class PrefabRepository {
  constructor(private readonly db: Database) {}

  async list(): Promise<PrefabSummary[]> {
    return this.db.run<PrefabSummary>(
      QueryBuilder.table('prefabs').order('name').select('id, slug, name'),
    );
  }

  async findById(id: PrefabId): Promise<PrefabCatalog | null> {
    const rows = await this.db.run<PrefabRow>(
      QueryBuilder.table('prefabs').where('id', id).limit(1).select(),
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description ?? undefined,
      tags: row.tags_json ? (JSON.parse(row.tags_json) as string[]) : [],
      kitRef: row.kit_ref ?? undefined,
      materials: await this.materials(id),
      previews: await this.previews(id),
    };
  }

  async save(prefab: PrefabCatalog): Promise<void> {
    const row = {
      id: prefab.id,
      slug: prefab.slug,
      name: prefab.name,
      description: prefab.description ?? null,
      tags_json: JSON.stringify(prefab.tags ?? []),
      kit_ref: prefab.kitRef ?? null,
    };
    const existing = await this.db.run<PrefabRow>(
      QueryBuilder.table('prefabs').where('id', prefab.id).limit(1).select('id'),
    );
    if (existing.length) {
      const { id, ...rest } = row;
      await this.db.exec(QueryBuilder.table('prefabs').where('id', id).update({ ...rest }));
    } else {
      await this.db.exec(QueryBuilder.table('prefabs').insert({ ...row }));
    }
  }

  async delete(id: PrefabId): Promise<boolean> {
    await this.db.exec(QueryBuilder.table('prefab_previews').where('prefab_id', id).delete());
    await this.db.exec(QueryBuilder.table('prefab_materials').where('prefab_id', id).delete());
    const affected = await this.db.exec(QueryBuilder.table('prefabs').where('id', id).delete());
    return affected > 0;
  }

  private async materials(id: PrefabId): Promise<PrefabMaterial[]> {
    const rows = await this.db.run<MaterialRow>(
      QueryBuilder.table('prefab_materials').where('prefab_id', id).select(),
    );
    return rows.map((r) => ({
      id: r.material_id,
      name: r.name,
      metallicFactor: r.metallic_factor ?? undefined,
      roughnessFactor: r.roughness_factor ?? undefined,
      baseColorFactor: r.base_color_factor_json
        ? (JSON.parse(r.base_color_factor_json) as number[])
        : null,
    }));
  }

  private async previews(id: PrefabId): Promise<PrefabPreview[]> {
    const rows = await this.db.run<PreviewRow>(
      QueryBuilder.table('prefab_previews').where('prefab_id', id).select(),
    );
    return rows.map((r) => ({
      materialId: r.material_id,
      cameraPreset: r.camera_preset,
      jpegRef: r.jpeg_ref,
    }));
  }
}
