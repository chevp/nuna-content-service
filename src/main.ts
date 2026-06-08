/**
 * Bootstrap entrypoint.
 *
 * Wiring order:
 *   config → db + redis + storage → caches → event bus → AppContext
 *   → express app → http server → realtime (ws gateway + sync service)
 */

import { createServer } from 'node:http';
import { createApp } from './app';
import { MemoryCache, type Cache } from './core/cache/memory-cache';
import { RedisCache } from './core/cache/redis-cache';
import { loadConfig } from './core/config';
import type { AppContext } from './core/context';
import { Database } from './core/db/mariadb';
import { eventBus } from './core/events/event-bus';
import { createRedis } from './infrastructure/redis';
import { createStorage } from './infrastructure/storage';
import { WsGateway } from './modules/realtime/ws.gateway';
import { SyncService } from './modules/realtime/sync.service';
import { logger } from './shared/utils';

async function buildContext(): Promise<AppContext> {
  const config = loadConfig();
  const db = await Database.connect(config.mariadb);
  const storage = createStorage(config.storage);

  // Shared store for all three cache domains: Redis when available, else memory.
  let backing: Cache;
  if (config.redis.url && config.env !== 'test') {
    backing = new RedisCache(await createRedis(config.redis));
  } else {
    backing = new MemoryCache();
  }

  return {
    config,
    db,
    storage,
    eventBus,
    cache: { chunk: backing, scene: backing, entity: backing },
  };
}

async function main(): Promise<void> {
  const ctx = await buildContext();
  const app = createApp(ctx);
  const server = createServer(app);

  // Realtime (optional): attach ws gateway and wire it to domain events.
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
    server.close(() => ctx.db.close().then(() => process.exit(0)));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error('fatal: failed to start', err);
  process.exit(1);
});
