/**
 * World state persistence. A world is a lightweight header (id, name) over the
 * flat entity set; chunk membership lives on the entities themselves.
 */

import type { Database } from '../../core/db/mariadb';
import { QueryBuilder } from '../../core/db/mariadb';
import type { WorldId, WorldState } from '../../shared/types';

interface WorldRow {
  id: string;
  name: string;
}

export class WorldRepository {
  constructor(private readonly db: Database) {}

  async findById(id: WorldId): Promise<WorldState | null> {
    const rows = await this.db.run<WorldRow>(
      QueryBuilder.table('worlds').where('id', id).limit(1).select(),
    );
    if (rows.length === 0) return null;
    return { id: rows[0].id, name: rows[0].name, loadedChunks: [] };
  }

  async upsert(state: Pick<WorldState, 'id' | 'name'>): Promise<void> {
    const existing = await this.findById(state.id);
    if (existing) {
      await this.db.exec(
        QueryBuilder.table('worlds').where('id', state.id).update({ name: state.name }),
      );
    } else {
      await this.db.exec(QueryBuilder.table('worlds').insert(state));
    }
  }
}
