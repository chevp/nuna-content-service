/**
 * In-process event bus.
 *
 * The spine of the runtime-editing flow: a mutation emits an event, caches
 * invalidate, and the realtime module pushes diffs. Domain events include
 * `entity.updated`, `scene.changed`, `chunk.loaded`.
 */

import { logger } from '../../shared/utils';

export type DomainEvent =
  | { type: 'entity.created'; entityId: string }
  | { type: 'entity.updated'; entityId: string; chunkX: number; chunkY: number }
  | { type: 'entity.deleted'; entityId: string }
  | { type: 'scene.changed'; sceneId: string }
  | { type: 'chunk.loaded'; chunkX: number; chunkY: number };

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
