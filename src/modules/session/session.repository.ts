/** Game-session persistence. A session is a runtime instance record. */

import type { Database } from '../../core/db/mariadb';
import { QueryBuilder } from '../../core/db/mariadb';
import type { GameSession, SessionId, SessionStatus } from '../../shared/types';

interface SessionRow {
  id: string;
  tenant_id: string;
  world_id: string;
  status: SessionStatus;
  props_json: string;
  runtime_endpoint: string | null;
  created_at: number;
}

const toSession = (row: SessionRow): GameSession => ({
  id: row.id,
  tenantId: row.tenant_id,
  worldId: row.world_id,
  status: row.status,
  props: JSON.parse(row.props_json),
  runtimeEndpoint: row.runtime_endpoint ?? undefined,
  createdAt: row.created_at,
});

export class SessionRepository {
  constructor(private readonly db: Database) {}

  async findById(id: SessionId): Promise<GameSession | null> {
    const rows = await this.db.run<SessionRow>(
      QueryBuilder.table('sessions').where('id', id).limit(1).select(),
    );
    return rows.length ? toSession(rows[0]) : null;
  }

  async list(tenantId?: string): Promise<GameSession[]> {
    const qb = QueryBuilder.table('sessions');
    if (tenantId) qb.where('tenant_id', tenantId);
    const rows = await this.db.run<SessionRow>(qb.order('created_at DESC').select());
    return rows.map(toSession);
  }

  async insert(session: GameSession): Promise<void> {
    await this.db.exec(
      QueryBuilder.table('sessions').insert({
        id: session.id,
        tenant_id: session.tenantId,
        world_id: session.worldId,
        status: session.status,
        props_json: JSON.stringify(session.props),
        runtime_endpoint: session.runtimeEndpoint ?? null,
        created_at: session.createdAt,
      }),
    );
  }

  async update(session: GameSession): Promise<void> {
    await this.db.exec(
      QueryBuilder.table('sessions')
        .where('id', session.id)
        .update({
          status: session.status,
          props_json: JSON.stringify(session.props),
          runtime_endpoint: session.runtimeEndpoint ?? null,
        }),
    );
  }

  async delete(id: SessionId): Promise<boolean> {
    const affected = await this.db.exec(QueryBuilder.table('sessions').where('id', id).delete());
    return affected > 0;
  }
}
