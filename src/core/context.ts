/**
 * AppContext — the shared dependency bundle threaded into every module.
 *
 * Built once at bootstrap (see app.ts) and passed to module factories so
 * services receive their db / caches / event bus / storage explicitly rather
 * than reaching for globals.
 */

import type { Cache } from './cache/memory-cache';
import type { Database } from './db/mariadb';
import type { EventBus } from './events/event-bus';
import type { StorageClient } from '../infrastructure/storage';
import type { AppConfig } from './config';

export interface AppContext {
  config: AppConfig;
  db: Database;
  eventBus: EventBus;
  storage: StorageClient;
  /** Three logical cache domains share one backing store, separated by prefix. */
  cache: {
    chunk: Cache;
    scene: Cache;
    entity: Cache;
  };
}
