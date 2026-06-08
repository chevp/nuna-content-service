/**
 * Redis client adapter (infrastructure).
 *
 * Exposes a tiny key/value contract consumed by core/cache/redis-cache.ts.
 * Loads the `redis` driver lazily; falls back to an in-memory map so the
 * service runs without a Redis instance during development.
 */

import type { AppConfig } from '../../core/config';
import { logger } from '../../shared/utils';

export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs?: number): Promise<void>;
  del(key: string): Promise<void>;
  publish(channel: string, message: string): Promise<void>;
  close(): Promise<void>;
}

class InMemoryRedis implements RedisLike {
  private readonly store = new Map<string, string>();
  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }
  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
  async publish(channel: string, message: string): Promise<void> {
    logger.info('redis(stub) publish', { channel, message });
  }
  async close(): Promise<void> {
    this.store.clear();
  }
}

export async function createRedis(config: AppConfig['redis']): Promise<RedisLike> {
  const driver = (await import('redis').catch(() => null)) as {
    createClient: (opts: unknown) => {
      connect: () => Promise<void>;
      get: (k: string) => Promise<string | null>;
      set: (k: string, v: string, opts?: unknown) => Promise<unknown>;
      del: (k: string) => Promise<unknown>;
      publish: (c: string, m: string) => Promise<unknown>;
      quit: () => Promise<unknown>;
    };
  } | null;

  if (!driver) {
    logger.warn('redis driver not installed — using in-memory stub');
    return new InMemoryRedis();
  }

  const client = driver.createClient({ url: config.url });
  await client.connect();
  return {
    get: (k) => client.get(k),
    set: async (k, v, ttlMs) => {
      await client.set(k, v, ttlMs ? { PX: ttlMs } : undefined);
    },
    del: async (k) => {
      await client.del(k);
    },
    publish: async (c, m) => {
      await client.publish(c, m);
    },
    close: async () => {
      await client.quit();
    },
  };
}
