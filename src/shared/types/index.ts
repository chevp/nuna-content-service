/**
 * Domain types shared across modules.
 *
 * The world is a flat set of entities partitioned into chunks. A scene is not
 * stored data — it is a query (filter + rules) whose result is computed and
 * cached at runtime. See modules/scene.
 */

export type EntityId = string;
export type WorldId = string;
export type SceneId = string;
export type AssetId = string;

/** A 2D chunk coordinate. The world is partitioned on (chunkX, chunkY). */
export interface ChunkCoord {
  chunkX: number;
  chunkY: number;
}

/** Render-only component attached to an entity (stored as data_json). */
export interface EntityComponent {
  componentType: string;
  data: Record<string, unknown>;
}

/**
 * Core entity record. Mirrors the `entities` table:
 *   id, type, pos_x, pos_y, pos_z, mesh_id, chunk_x, chunk_y
 */
export interface Entity {
  id: EntityId;
  type: string;
  posX: number;
  posY: number;
  posZ: number;
  meshId: AssetId | null;
  chunkX: number;
  chunkY: number;
  components?: EntityComponent[];
}

/** Asset metadata — mesh / material / file path resolution. */
export interface Asset {
  id: AssetId;
  kind: 'mesh' | 'material' | 'texture' | 'gltf' | 'bin';
  uri: string;
  materialRefs?: AssetId[];
}

/** How a scene selects its entity set. */
export type SceneFilter =
  | { kind: 'chunk'; chunks: ChunkCoord[] }
  | { kind: 'tag'; tags: string[] }
  | { kind: 'entity-list'; ids: EntityId[] };

/**
 * A scene definition. The `filter` selects entities; optional `rules` post-
 * process the set. The computed result is runtime-only (cache), never stored.
 */
export interface SceneDefinition {
  id: SceneId;
  name: string;
  filter: SceneFilter;
  rules?: SceneRule[];
}

export interface SceneRule {
  op: 'include' | 'exclude' | 'limit';
  value: unknown;
}

/** Computed scene payload returned to clients. */
export interface SceneResult {
  scene: SceneId;
  entities: Entity[];
  assets: Asset[];
  computedAt: number;
}

export interface WorldState {
  id: WorldId;
  name: string;
  loadedChunks: ChunkCoord[];
}
