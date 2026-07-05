/**
 * AppContext — the shared dependency bundle threaded into every module.
 *
 * Built once at bootstrap (see app.ts) and passed to module factories so
 * services receive their kaga client / caches / event bus / storage explicitly
 * rather than reaching for globals.
 */

import type { Cache } from './cache/memory-cache';
import type { KagaClient } from './kaga/kaga-client';
import type { EventBus } from './events/event-bus';
import type { StorageClient } from '../infrastructure/storage';
import type { AppConfig } from './config';

export interface AppContext {
  config: AppConfig;
  kaga: KagaClient;
  eventBus: EventBus;
  storage: StorageClient;
  /** Cache domains for the composition layer; share one backing store. */
  cache: {
    world: Cache;
    scene: Cache;
    prefab: Cache;
  };
}
