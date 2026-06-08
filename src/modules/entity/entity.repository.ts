/**
 * Entity persistence. Maps the flat `entities` table (and `entity_components`)
 * to/from the domain `Entity`.
 */

import type { Database } from '../../core/db/mariadb';
import { QueryBuilder } from '../../core/db/mariadb';
import type { Entity, EntityComponent, EntityId } from '../../shared/types';

interface EntityRow {
  id: string;
  type: string;
  pos_x: number;
  pos_y: number;
  pos_z: number;
  mesh_id: string | null;
  chunk_x: number;
  chunk_y: number;
}

interface ComponentRow {
  entity_id: string;
  component_type: string;
  data_json: string;
}

const toEntity = (row: EntityRow, components: EntityComponent[] = []): Entity => ({
  id: row.id,
  type: row.type,
  posX: row.pos_x,
  posY: row.pos_y,
  posZ: row.pos_z,
  meshId: row.mesh_id,
  chunkX: row.chunk_x,
  chunkY: row.chunk_y,
  components,
});

const toRow = (e: Entity): EntityRow => ({
  id: e.id,
  type: e.type,
  pos_x: e.posX,
  pos_y: e.posY,
  pos_z: e.posZ,
  mesh_id: e.meshId,
  chunk_x: e.chunkX,
  chunk_y: e.chunkY,
});

export class EntityRepository {
  constructor(private readonly db: Database) {}

  async findById(id: EntityId): Promise<Entity | null> {
    const rows = await this.db.run<EntityRow>(
      QueryBuilder.table('entities').where('id', id).limit(1).select(),
    );
    if (rows.length === 0) return null;
    return toEntity(rows[0], await this.loadComponents(id));
  }

  async findByChunks(chunks: { chunkX: number; chunkY: number }[]): Promise<Entity[]> {
    if (chunks.length === 0) return [];
    // (chunk_x, chunk_y) tuple match via OR of pairs.
    const params: unknown[] = [];
    const clause = chunks
      .map((c) => {
        params.push(c.chunkX, c.chunkY);
        return '(chunk_x = ? AND chunk_y = ?)';
      })
      .join(' OR ');
    const rows = await this.db.run<EntityRow>({
      sql: `SELECT * FROM entities WHERE ${clause}`,
      params,
    });
    return rows.map((r) => toEntity(r));
  }

  async findByIds(ids: EntityId[]): Promise<Entity[]> {
    if (ids.length === 0) return [];
    const rows = await this.db.run<EntityRow>(
      QueryBuilder.table('entities').whereIn('id', ids).select(),
    );
    return rows.map((r) => toEntity(r));
  }

  async insert(entity: Entity): Promise<void> {
    await this.db.exec(QueryBuilder.table('entities').insert({ ...toRow(entity) }));
    await this.replaceComponents(entity.id, entity.components ?? []);
  }

  async update(entity: Entity): Promise<void> {
    const { id, ...row } = toRow(entity);
    await this.db.exec(QueryBuilder.table('entities').where('id', id).update({ ...row }));
    if (entity.components) await this.replaceComponents(id, entity.components);
  }

  async delete(id: EntityId): Promise<void> {
    await this.db.exec(QueryBuilder.table('entity_components').where('entity_id', id).delete());
    await this.db.exec(QueryBuilder.table('entities').where('id', id).delete());
  }

  private async loadComponents(id: EntityId): Promise<EntityComponent[]> {
    const rows = await this.db.run<ComponentRow>(
      QueryBuilder.table('entity_components').where('entity_id', id).select(),
    );
    return rows.map((r) => ({
      componentType: r.component_type,
      data: JSON.parse(r.data_json) as Record<string, unknown>,
    }));
  }

  private async replaceComponents(id: EntityId, components: EntityComponent[]): Promise<void> {
    await this.db.exec(QueryBuilder.table('entity_components').where('entity_id', id).delete());
    for (const c of components) {
      await this.db.exec(
        QueryBuilder.table('entity_components').insert({
          entity_id: id,
          component_type: c.componentType,
          data_json: JSON.stringify(c.data),
        }),
      );
    }
  }
}
