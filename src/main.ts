/**
 * Bootstrap entrypoint.
 *
 * Wiring order:
 *   config → kaga + redis + storage → caches → event bus → AppContext
 *   → express app → http server → realtime (ws gateway + sync service)
 */

import { createServer } from 'node:http';
import { createApp } from './app';
import { MemoryCache, type Cache } from './core/cache/memory-cache';
import { RedisCache } from './core/cache/redis-cache';
import { loadConfig } from './core/config';
import type { AppContext } from './core/context';
import { KagaClient } from './core/kaga/kaga-client';
import { eventBus } from './core/events/event-bus';
import { createRedis } from './infrastructure/redis';
import { createStorage } from './infrastructure/storage';
import { WsGateway } from './modules/realtime/ws.gateway';
import { SyncService } from './modules/realtime/sync.service';
import { logger } from './shared/utils';

async function buildContext(): Promise<AppContext> {
  const config = loadConfig();
  const kaga = new KagaClient(config.kaga);
  const storage = createStorage(config.storage);

  let backing: Cache;
  if (config.redis.url && config.env !== 'test') {
    backing = new RedisCache(await createRedis(config.redis));
  } else {
    backing = new MemoryCache();
  }

  return {
    config,
    kaga,
    storage,
    eventBus,
    cache: { world: backing, scene: backing, prefab: backing },
  };
}

async function main(): Promise<void> {
  const ctx = await buildContext();
  const app = createApp(ctx);
  const server = createServer(app);

  const gateway = new WsGateway();
  await gateway.attach(server);
  new SyncService(ctx, gateway).start();

  server.listen(ctx.config.port, () => {
    logger.info(`nuna-content-service listening on :${ctx.config.port}`, {
      env: ctx.config.env,
    });
  });

  const shutdown = () => {
    logger.info('shutting down');
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error('fatal: failed to start', err);
  process.exit(1);
});
