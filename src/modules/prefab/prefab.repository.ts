/**
 * Prefab catalog persistence.
 *
 * Indexes catalog metadata (`prefabs`) only. The `.prefab` kit itself lives in
 * storage, referenced by `kit_ref`; its interior (meshes, materials, ...) is
 * opaque to this service.
 */

import type { Database } from '../../core/db/mariadb';
import { QueryBuilder } from '../../core/db/mariadb';
import type { PrefabCatalog, PrefabId } from '../../shared/types';

interface PrefabRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tags_json: string | null;
  kit_ref: string | null;
  preview_uri: string | null;
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
      previewUri: row.preview_uri ?? undefined,
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
      preview_uri: prefab.previewUri ?? null,
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
    const affected = await this.db.exec(QueryBuilder.table('prefabs').where('id', id).delete());
    return affected > 0;
  }
}
