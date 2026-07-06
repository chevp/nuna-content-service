import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { MemoryCache } from '../src/core/cache/memory-cache';
import { loadConfig } from '../src/core/config';
import type { AppContext } from '../src/core/context';
import { KagaClient } from '../src/core/kaga/kaga-client';
import { eventBus } from '../src/core/events/event-bus';
import { createStorage } from '../src/infrastructure/storage';

function testContext(): AppContext {
  const config = loadConfig({ NODE_ENV: 'test', AUTH_ENABLED: 'false' } as NodeJS.ProcessEnv);
  const cache = new MemoryCache();
  return {
    config,
    kaga: new KagaClient(config.kaga),
    eventBus,
    storage: createStorage(config.storage),
    cache: { world: cache, scene: cache, prefab: cache },
  };
}

describe('app', () => {
  it('serves health', async () => {
    const app = createApp(testContext());
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('404s unknown routes', async () => {
    const app = createApp(testContext());
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
  });
});
