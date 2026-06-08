/**
 * MariaDB driver adapter (infrastructure).
 *
 * Wraps the raw connection pool. Higher layers talk to core/db/mariadb.ts,
 * which depends on this adapter — modules never import the driver directly.
 *
 * The concrete `mariadb` npm driver is loaded lazily so the scaffold builds
 * and the rest of the app runs without a live database during development.
 */

import type { AppConfig } from '../../core/config';
import { logger } from '../../shared/utils';

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  affectedRows: number;
  insertId?: number | string;
}

export interface SqlConnection {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  close(): Promise<void>;
}

/**
 * In-memory stand-in used until a real MariaDB pool is wired up. Keeps the
 * service runnable end-to-end without external infrastructure.
 */
class InMemoryConnection implements SqlConnection {
  async query<T>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    logger.warn('mariadb: in-memory stub query', { sql, params });
    return { rows: [], affectedRows: 0 };
  }
  async close(): Promise<void> {
    /* no-op */
  }
}

export async function createConnection(config: AppConfig['mariadb']): Promise<SqlConnection> {
  try {
    // Lazy import: only required when a real driver is installed.
    const driver = (await import('mariadb').catch(() => null)) as
      | { createPool: (opts: unknown) => unknown }
      | null;
    if (!driver) {
      logger.warn('mariadb driver not installed — using in-memory stub');
      return new InMemoryConnection();
    }
    const pool = driver.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectionLimit: 10,
    }) as {
      query: (sql: string, params?: unknown[]) => Promise<unknown>;
      end: () => Promise<void>;
    };
    return {
      async query<T>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
        const rows = (await pool.query(sql, params)) as T[];
        return { rows, affectedRows: Array.isArray(rows) ? 0 : 0 };
      },
      async close() {
        await pool.end();
      },
    };
  } catch (err) {
    logger.error('mariadb connection failed — falling back to stub', err);
    return new InMemoryConnection();
  }
}
