/**
 * Session service — the game-session registry.
 *
 * A game-session is a runtime instance of a world. This service owns the
 * session record (world reference, status, settings overrides, runtime
 * endpoint); the actual runtime is driven by iris-player / the relay daemon.
 * Status transitions emit events so the realtime module can push updates.
 */

import type { AppContext } from '../../core/context';
import type { CreateSessionDto, UpdateSessionDto } from '../../shared/dto';
import type { GameSession, SessionId, SessionStatus } from '../../shared/types';
import { base62Id } from '../../shared/utils';
import { WorldRepository } from '../world/world.repository';
import { SessionRepository } from './session.repository';

export class SessionService {
  private readonly repo: SessionRepository;
  private readonly worlds: WorldRepository;

  constructor(private readonly ctx: AppContext) {
    this.repo = new SessionRepository(ctx.db);
    this.worlds = new WorldRepository(ctx.db);
  }

  list(): Promise<GameSession[]> {
    return this.repo.list();
  }

  get(id: SessionId): Promise<GameSession | null> {
    return this.repo.findById(id);
  }

  /** Create a session for a world. Fails if the world does not exist. */
  async create(dto: CreateSessionDto): Promise<GameSession | null> {
    const world = await this.worlds.findById(dto.worldId);
    if (!world) return null;

    const session: GameSession = {
      id: base62Id(),
      worldId: dto.worldId,
      status: 'created',
      settings: dto.settings ?? {},
      createdAt: Date.now(),
    };
    await this.repo.insert(session);
    await this.ctx.eventBus.emit({
      type: 'session.created',
      sessionId: session.id,
      worldId: session.worldId,
    });
    return session;
  }

  async update(id: SessionId, dto: UpdateSessionDto): Promise<GameSession | null> {
    const current = await this.repo.findById(id);
    if (!current) return null;

    const next: GameSession = {
      ...current,
      status: dto.status ?? current.status,
      settings: dto.settings ?? current.settings,
      runtimeEndpoint: dto.runtimeEndpoint ?? current.runtimeEndpoint,
    };
    await this.repo.update(next);

    if (dto.status && dto.status !== current.status) {
      await this.emitStatus(id, dto.status);
    }
    return next;
  }

  /** Convenience transition used by lifecycle endpoints. */
  async transition(id: SessionId, status: SessionStatus): Promise<GameSession | null> {
    return this.update(id, { status });
  }

  async delete(id: SessionId): Promise<boolean> {
    const ok = await this.repo.delete(id);
    if (ok) await this.emitStatus(id, 'stopped');
    return ok;
  }

  private async emitStatus(id: SessionId, status: SessionStatus): Promise<void> {
    await this.ctx.eventBus.emit({ type: 'session.statusChanged', sessionId: id, status });
  }
}
