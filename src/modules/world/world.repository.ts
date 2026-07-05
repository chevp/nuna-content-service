/**
 * World persistence via kaga.
 *
 * Each WorldComposition is stored as a kaga Node (kind='world'). The full
 * document lives in the node payload; kaga assigns the node id, which becomes
 * the domain WorldId. Placements remain embedded in the payload — no separate
 * edges are needed for the composition layer.
 */

import type { KagaClient } from '../../core/kaga/kaga-client';
import type { WorldComposition, WorldId } from '../../shared/types';

export interface WorldSummary {
  id: string;
  title: string;
  version: string;
}

export class WorldRepository {
  constructor(private readonly kaga: KagaClient) {}

  async findById(id: WorldId): Promise<WorldComposition | null> {
    const node = await this.kaga.getNode(id);
    if (!node) return null;
    const world = node.payload as unknown as WorldComposition;
    return { ...world, id: node.id };
  }

  async list(): Promise<WorldSummary[]> {
    const nodes = await this.kaga.listNodes('world');
    return nodes.map((n) => ({
      id: n.id,
      title: n.label,
      version: typeof n.payload['version'] === 'string' ? n.payload['version'] : '1.0',
    }));
  }

  /** Save a world. For new worlds (empty id) kaga assigns the id; returns the saved entity. */
  async save(world: WorldComposition): Promise<WorldComposition> {
    const input = {
      kind: 'world',
      label: world.title,
      payload: world as unknown as Record<string, unknown>,
    };
    if (world.id) {
      await this.kaga.updateNode(world.id, input);
      return world;
    }
    const node = await this.kaga.createNode(input);
    return { ...world, id: node.id };
  }

  async delete(id: WorldId): Promise<boolean> {
    return this.kaga.deleteNode(id);
  }
}
