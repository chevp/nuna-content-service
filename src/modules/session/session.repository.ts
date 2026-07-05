/** Game-session persistence via kaga (kind='session'). */

import type { KagaClient } from '../../core/kaga/kaga-client';
import type { GameSession, SessionId } from '../../shared/types';

export class SessionRepository {
  constructor(private readonly kaga: KagaClient) {}

  async findById(id: SessionId): Promise<GameSession | null> {
    const node = await this.kaga.getNode(id);
    if (!node) return null;
    const session = node.payload as unknown as GameSession;
    return { ...session, id: node.id };
  }

  async list(): Promise<GameSession[]> {
    const nodes = await this.kaga.listNodes('session');
    return nodes.map((n) => {
      const session = n.payload as unknown as GameSession;
      return { ...session, id: n.id };
    });
  }

  /** Create a new session; kaga assigns the id. Returns the saved session. */
  async insert(session: GameSession): Promise<GameSession> {
    const node = await this.kaga.createNode({
      kind: 'session',
      label: session.worldId,
      payload: session as unknown as Record<string, unknown>,
    });
    return { ...session, id: node.id };
  }

  async update(session: GameSession): Promise<void> {
    await this.kaga.updateNode(session.id, {
      kind: 'session',
      label: session.worldId,
      payload: session as unknown as Record<string, unknown>,
    });
  }

  async delete(id: SessionId): Promise<boolean> {
    return this.kaga.deleteNode(id);
  }
}
