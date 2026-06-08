/**
 * Application-facing database layer.
 *
 * Owns the MariaDB connection and exposes a small typed surface used by
 * repositories. Wraps infrastructure/mariadb so modules depend on this, not
 * on the raw driver.
 */

import { createConnection, type SqlConnection } from '../../infrastructure/mariadb';
import type { AppConfig } from '../config';
import type { BuiltQuery } from './query-builder';

export class Database {
  private constructor(private readonly conn: SqlConnection) {}

  static async connect(config: AppConfig['mariadb']): Promise<Database> {
    return new Database(await createConnection(config));
  }

  /** Run a built query, returning typed rows. */
  async run<T = Record<string, unknown>>(query: BuiltQuery): Promise<T[]> {
    const { rows } = await this.conn.query<T>(query.sql, query.params);
    return rows;
  }

  /** Run a built mutation, returning affected row count. */
  async exec(query: BuiltQuery): Promise<number> {
    const { affectedRows } = await this.conn.query(query.sql, query.params);
    return affectedRows;
  }

  async close(): Promise<void> {
    await this.conn.close();
  }
}

export type { BuiltQuery } from './query-builder';
export { QueryBuilder } from './query-builder';
