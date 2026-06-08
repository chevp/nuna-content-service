/**
 * World persistence — canonical document + placement index.
 *
 * The full `WorldComposition` is stored as `doc_json` (lossless round-trip with
 * the container's world.json). The `placements` index table is derived from it
 * for querying/gating, and rewritten on save. Placements name their scene
 * directly — there is no palette.
 */

import type { Database } from '../../core/db/mariadb';
import { QueryBuilder } from '../../core/db/mariadb';
import type { Placement, WorldComposition, WorldId } from '../../shared/types';

interface WorldRow {
  id: string;
  tenant_id: string;
  title: string;
  version: string;
  comment: string | null;
  props_json: string;
  doc_json: string;
}

export interface WorldSummary {
  id: string;
  title: string;
  version: string;
}

export class WorldRepository {
  constructor(private readonly db: Database) {}

  async findById(id: WorldId): Promise<WorldComposition | null> {
    const rows = await this.db.run<WorldRow>(
      QueryBuilder.table('worlds').where('id', id).limit(1).select(),
    );
    return rows.length ? (JSON.parse(rows[0].doc_json) as WorldComposition) : null;
  }

  async list(tenantId?: string): Promise<WorldSummary[]> {
    const qb = QueryBuilder.table('worlds');
    if (tenantId) qb.where('tenant_id', tenantId);
    return this.db.run<WorldSummary>(qb.order('title').select('id, title, version'));
  }

  async save(world: WorldComposition): Promise<void> {
    const row = {
      id: world.id,
      tenant_id: world.tenantId,
      title: world.title,
      version: world.version,
      comment: world.comment ?? null,
      props_json: JSON.stringify(world.props ?? {}),
      doc_json: JSON.stringify(world),
    };
    const existing = await this.db.run<WorldRow>(
      QueryBuilder.table('worlds').where('id', world.id).limit(1).select('id'),
    );
    if (existing.length) {
      const { id, ...rest } = row;
      await this.db.exec(QueryBuilder.table('worlds').where('id', id).update({ ...rest }));
    } else {
      await this.db.exec(QueryBuilder.table('worlds').insert({ ...row }));
    }
    await this.rewriteIndex(world);
  }

  async delete(id: WorldId): Promise<boolean> {
    await this.db.exec(QueryBuilder.table('placements').where('world_id', id).delete());
    const affected = await this.db.exec(QueryBuilder.table('worlds').where('id', id).delete());
    return affected > 0;
  }

  /** Rebuild the placement index rows from the canonical document. */
  private async rewriteIndex(world: WorldComposition): Promise<void> {
    await this.db.exec(QueryBuilder.table('placements').where('world_id', world.id).delete());

    let ordinal = 0;
    for (const p of world.world as Placement[]) {
      await this.db.exec(
        QueryBuilder.table('placements').insert({
          id: p.id,
          world_id: world.id,
          ordinal: (ordinal += 1),
          scene_name: p.scene,
          when_setting: p.whenSetting ?? null,
          params_json: p.params ? JSON.stringify(p.params) : null,
        }),
      );
    }
  }
}
