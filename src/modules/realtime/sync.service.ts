/**
 * Sync service — bridges composition events to live clients.
 *
 * Subscribes to the event bus and pushes updates over the WebSocket gateway so
 * running game-sessions and editors react to content changes:
 *   world.published        → world palette/placements changed
 *   scene.updated          → an authored scene changed
 *   session.statusChanged  → a session moved (created/starting/running/…)
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
      this.ctx.eventBus.on('world.published', (e) => {
        this.gateway.broadcast({
          channel: `world:${e.worldId}`,
          payload: { type: 'world.published', worldId: e.worldId },
        });
      }),
      this.ctx.eventBus.on('scene.updated', (e) => {
        this.gateway.broadcast({
          channel: `scene:${e.sceneId}`,
          payload: { type: 'scene.updated', sceneId: e.sceneId },
        });
      }),
      this.ctx.eventBus.on('session.statusChanged', (e) => {
        this.gateway.broadcast({
          channel: `session:${e.sessionId}`,
          payload: { type: 'session.statusChanged', sessionId: e.sessionId, status: e.status },
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
