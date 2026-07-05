/**
 * Scene persistence via kaga (kind='scene').
 *
 * The full SceneRecord (including the opaque scene document) is stored in the
 * node payload. kaga assigns the node id, which becomes the domain SceneId.
 */

import type { KagaClient } from '../../core/kaga/kaga-client';
import type { SceneId, SceneRecord } from '../../shared/types';

export interface SceneSummary {
  id: string;
  name: string;
  version: string;
}

export class SceneRepository {
  constructor(private readonly kaga: KagaClient) {}

  async findById(id: SceneId): Promise<SceneRecord | null> {
    const node = await this.kaga.getNode(id);
    if (!node) return null;
    const scene = node.payload as unknown as SceneRecord;
    return { ...scene, id: node.id };
  }

  async list(): Promise<SceneSummary[]> {
    const nodes = await this.kaga.listNodes('scene');
    return nodes.map((n) => ({
      id: n.id,
      name: n.label,
      version: typeof n.payload['version'] === 'string' ? n.payload['version'] : '1.0',
    }));
  }

  /** Save a scene. For new scenes (empty id) kaga assigns the id; returns the saved entity. */
  async save(scene: SceneRecord): Promise<SceneRecord> {
    const input = {
      kind: 'scene',
      label: scene.name,
      payload: scene as unknown as Record<string, unknown>,
    };
    if (scene.id) {
      await this.kaga.updateNode(scene.id, input);
      return scene;
    }
    const node = await this.kaga.createNode(input);
    return { ...scene, id: node.id };
  }

  async delete(id: SceneId): Promise<boolean> {
    return this.kaga.deleteNode(id);
  }
}
