/**
 * Sync service — bridges domain events to live clients.
 *
 * Subscribes to the event bus and pushes diffs over the WebSocket gateway:
 *   entity.updated → entity diff   scene.changed → scene invalidation
 *   chunk.loaded   → chunk hint
 * This closes the runtime-editing loop (mutate → event → realtime push).
 */

import type { AppContext } from '../../core/context';
import { logger } from '../../shared/utils';
import type { WsGateway } from './ws.gateway';

export class SyncService {
  private readonly unsubscribers: Array<() => void> = [];

  constructor(
    private readonly ctx: AppContext,
    private readonly gateway: WsGateway,
  ) {}

  start(): void {
    this.unsubscribers.push(
      this.ctx.eventBus.on('entity.updated', (e) => {
        this.gateway.broadcast({
          channel: `chunk:${e.chunkX}:${e.chunkY}`,
          payload: { type: 'entity.updated', entityId: e.entityId },
        });
      }),
      this.ctx.eventBus.on('entity.deleted', (e) => {
        this.gateway.broadcast({
          channel: 'world',
          payload: { type: 'entity.deleted', entityId: e.entityId },
        });
      }),
      this.ctx.eventBus.on('scene.changed', (e) => {
        this.gateway.broadcast({
          channel: `scene:${e.sceneId}`,
          payload: { type: 'scene.changed', sceneId: e.sceneId },
        });
      }),
    );
    logger.info('realtime: sync service subscribed to event bus');
  }

  stop(): void {
    for (const off of this.unsubscribers) off();
    this.unsubscribers.length = 0;
  }
}
