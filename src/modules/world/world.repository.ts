/**
 * World persistence — canonical document + index tables.
 *
 * The full `WorldComposition` is stored as `doc_json` (lossless round-trip with
 * the container's world.json). The `world_scenes` (palette) and `placements`
 * index tables are derived from it for querying/gating, and rewritten on save.
 */

import type { Database } from '../../core/db/mariadb';
import { QueryBuilder } from '../../core/db/mariadb';
import type { Placement, Vec3, WorldComposition, WorldId } from '../../shared/types';

interface WorldRow {
  id: string;
  title: string;
  version: string;
  comment: string | null;
  settings_json: string;
  doc_json: string;
}

export interface WorldSummary {
  id: string;
  title: string;
  version: string;
}

const vec = (v: Vec3 | undefined): { x: number | null; y: number | null; z: number | null } =>
  v ? { x: v[0], y: v[1], z: v[2] } : { x: null, y: null, z: null };

export class WorldRepository {
  constructor(private readonly db: Database) {}

  async findById(id: WorldId): Promise<WorldComposition | null> {
    const rows = await this.db.run<WorldRow>(
      QueryBuilder.table('worlds').where('id', id).limit(1).select(),
    );
    return rows.length ? (JSON.parse(rows[0].doc_json) as WorldComposition) : null;
  }

  async list(): Promise<WorldSummary[]> {
    return this.db.run<WorldSummary>(
      QueryBuilder.table('worlds').order('title').select('id, title, version'),
    );
  }

  async save(world: WorldComposition): Promise<void> {
    const row = {
      id: world.id,
      title: world.title,
      version: world.version,
      comment: world.comment ?? null,
      settings_json: JSON.stringify(world.settings ?? {}),
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
    await this.db.exec(QueryBuilder.table('world_scenes').where('world_id', id).delete());
    const affected = await this.db.exec(QueryBuilder.table('worlds').where('id', id).delete());
    return affected > 0;
  }

  /** Rebuild the palette + placement index rows from the canonical document. */
  private async rewriteIndex(world: WorldComposition): Promise<void> {
    await this.db.exec(QueryBuilder.table('world_scenes').where('world_id', world.id).delete());
    await this.db.exec(QueryBuilder.table('placements').where('world_id', world.id).delete());

    for (const [key, ref] of Object.entries(world.scenes)) {
      await this.db.exec(
        QueryBuilder.table('world_scenes').insert({
          world_id: world.id,
          scene_key: key,
          scene_ref: ref,
        }),
      );
    }

    let ordinal = 0;
    for (const p of world.world as Placement[]) {
      const pos = vec(p.position);
      const rot = vec(p.rotation);
      const scl = vec(p.scale);
      await this.db.exec(
        QueryBuilder.table('placements').insert({
          id: p.id,
          world_id: world.id,
          ordinal: (ordinal += 1),
          scene_key: p.scene,
          pos_x: pos.x,
          pos_y: pos.y,
          pos_z: pos.z,
          rot_x: rot.x,
          rot_y: rot.y,
          rot_z: rot.z,
          scale_x: scl.x,
          scale_y: scl.y,
          scale_z: scl.z,
          when_setting: p.whenSetting ?? null,
        }),
      );
    }
  }
}
