/**
 * In-process event bus.
 *
 * The spine of the publish flow: a composition mutation emits an event, caches
 * invalidate, and the realtime module pushes updates to live sessions. Domain
 * events are composition-level: `world.published`, `scene.updated`,
 * `prefab.registered`, `session.statusChanged`.
 */

import { logger } from '../../shared/utils';
import type { SessionStatus } from '../../shared/types';

export type DomainEvent =
  | { type: 'world.published'; worldId: string }
  | { type: 'scene.updated'; sceneId: string }
  | { type: 'prefab.registered'; prefabId: string }
  | { type: 'session.created'; sessionId: string; worldId: string }
  | { type: 'session.statusChanged'; sessionId: string; status: SessionStatus };

export type EventType = DomainEvent['type'];
type Handler<E extends DomainEvent = DomainEvent> = (event: E) => void | Promise<void>;

export class EventBus {
  private readonly handlers = new Map<EventType, Set<Handler>>();

  on<T extends EventType>(type: T, handler: Handler<Extract<DomainEvent, { type: T }>>): () => void {
    const set = this.handlers.get(type) ?? new Set<Handler>();
    set.add(handler as Handler);
    this.handlers.set(type, set);
    return () => set.delete(handler as Handler);
  }

  async emit(event: DomainEvent): Promise<void> {
    const set = this.handlers.get(event.type);
    if (!set || set.size === 0) return;
    await Promise.all(
      [...set].map(async (h) => {
        try {
          await h(event);
        } catch (err) {
          logger.error(`event handler failed for ${event.type}`, err);
        }
      }),
    );
  }
}

/** Shared bus instance for the process. */
export const eventBus = new EventBus();
