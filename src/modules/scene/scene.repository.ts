/**
 * Scene persistence — canonical scene document (`*.scene.json`) stored as
 * `doc_json`, with name/version indexed for listing.
 */

import type { Database } from '../../core/db/mariadb';
import { QueryBuilder } from '../../core/db/mariadb';
import type { SceneId, SceneRecord } from '../../shared/types';

interface SceneRow {
  id: string;
  name: string;
  version: string;
  doc_json: string;
}

export interface SceneSummary {
  id: string;
  name: string;
  version: string;
}

const toRecord = (row: SceneRow): SceneRecord => ({
  id: row.id,
  name: row.name,
  version: row.version,
  doc: JSON.parse(row.doc_json),
});

export class SceneRepository {
  constructor(private readonly db: Database) {}

  async findById(id: SceneId): Promise<SceneRecord | null> {
    const rows = await this.db.run<SceneRow>(
      QueryBuilder.table('scenes').where('id', id).limit(1).select(),
    );
    return rows.length ? toRecord(rows[0]) : null;
  }

  async list(): Promise<SceneSummary[]> {
    return this.db.run<SceneSummary>(
      QueryBuilder.table('scenes').order('name').select('id, name, version'),
    );
  }

  async save(scene: SceneRecord): Promise<void> {
    const row = {
      id: scene.id,
      name: scene.name,
      version: scene.version,
      doc_json: JSON.stringify(scene.doc),
    };
    const existing = await this.db.run<SceneRow>(
      QueryBuilder.table('scenes').where('id', scene.id).limit(1).select('id'),
    );
    if (existing.length) {
      const { id, ...rest } = row;
      await this.db.exec(QueryBuilder.table('scenes').where('id', id).update({ ...rest }));
    } else {
      await this.db.exec(QueryBuilder.table('scenes').insert({ ...row }));
    }
  }

  async delete(id: SceneId): Promise<boolean> {
    const affected = await this.db.exec(QueryBuilder.table('scenes').where('id', id).delete());
    return affected > 0;
  }
}
