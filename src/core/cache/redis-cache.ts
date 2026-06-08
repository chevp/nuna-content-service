/**
 * Redis-backed cache (shared tier across instances).
 *
 * Implements the same `Cache` contract as MemoryCache so modules are agnostic
 * to the backing store. Prefix invalidation is tracked via a per-prefix index
 * set to avoid `KEYS` scans on the hot path.
 */

import type { RedisLike } from '../../infrastructure/redis';
import type { Cache } from './memory-cache';

export class RedisCache implements Cache {
  constructor(private readonly redis: RedisLike) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), ttlMs);
    const prefix = key.split(':')[0];
    const indexKey = `__index:${prefix}`;
    const existing = (await this.get<string[]>(indexKey)) ?? [];
    if (!existing.includes(key)) {
      await this.redis.set(indexKey, JSON.stringify([...existing, key]));
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    const indexKey = `__index:${prefix.replace(/:$/, '')}`;
    const keys = (await this.get<string[]>(indexKey)) ?? [];
    await Promise.all(keys.map((k) => this.redis.del(k)));
    await this.redis.del(indexKey);
  }
}
