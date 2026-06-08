/**
 * Process-local in-memory cache with TTL.
 *
 * Used as the hot tier (and the default when Redis is absent) for the three
 * cache domains: chunk sections, computed scene results, and hot entities.
 */

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  del(key: string): Promise<void>;
  /** Invalidate every key matching a prefix (e.g. `scene:`). */
  invalidatePrefix(prefix: string): Promise<void>;
}

interface Entry {
  value: unknown;
  expiresAt: number; // epoch ms; Infinity = never
}

export class MemoryCache implements Cache {
  private readonly store = new Map<string, Entry>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlMs ? this.now() + ttlMs : Number.POSITIVE_INFINITY,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}
