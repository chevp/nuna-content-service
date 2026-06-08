/**
 * Domain types — the COMPOSITION layer.
 *
 * The service composes scenes, worlds, prefabs and game-sessions. It never
 * deals with individual meshes or per-coordinate entities — that is the iris
 * engine / in-editor concern. Shapes mirror the container's `world.json`,
 * `*.scene.json` and `.prefab` catalogs so documents round-trip losslessly.
 */

export type WorldId = string;
export type SceneId = string;
export type PrefabId = string;
export type SessionId = string;

/** A 3-tuple a transform-based game may carry inside placement `params`. */
export type Vec3 = [number, number, number];

// --- world composition (mirrors world.json) ------------------------------

/**
 * One placement of a scene into a world: which scene (by name) is included, in
 * what order, and whether it is gated behind a setting.
 *
 * It deliberately carries NO transform. How a scene maps into a world — a
 * transform, a spawn point, a slot, or nothing at all — is game-specific, so it
 * lives in the opaque `params` bag rather than fixed columns.
 */
export interface Placement {
  id: string;
  scene: string; // scene name, referenced directly (no palette key)
  /** When set, the placement is only active if the named setting is truthy. */
  whenSetting?: string;
  /** Game-specific placement data, opaque to the service (e.g. a transform). */
  params?: Record<string, unknown>;
}

/**
 * A world is a composition: an ordered list of placements (each naming a scene)
 * plus Lua-evaluated settings. NOT a flat entity set.
 */
export interface WorldComposition {
  id: WorldId;
  title: string;
  version: string;
  comment?: string;
  settings: Record<string, unknown>;
  /** Ordered placements; the `world` array in world.json. */
  world: Placement[];
}

/** Result of resolving a world against settings: the active placements only. */
export interface ResolvedWorld {
  world: WorldId;
  title: string;
  settings: Record<string, unknown>;
  placements: Placement[];
}

// --- scene (mirrors *.scene.json) ----------------------------------------

/** Envelope of an authored scene document. Body is engine-defined and opaque. */
export interface SceneDoc {
  version: string;
  scene: {
    id: string;
    metadata?: Record<string, unknown>;
    camera?: Record<string, unknown>;
    entities?: unknown[];
    [k: string]: unknown;
  };
}

export interface SceneRecord {
  id: SceneId;
  name: string;
  version: string;
  doc: SceneDoc;
}

// --- prefab (mirrors a .prefab catalog) ----------------------------------

/**
 * A prefab catalog: a reusable kit referenced by scenes/worlds. The kit itself
 * (the `.prefab` SQLite / zip / local asset) is referenced by `kitRef` and is
 * opaque to this service -- its interior (meshes, materials, ...) is the
 * iris-engine concern. The service only indexes catalog metadata.
 */
export interface PrefabCatalog {
  id: PrefabId;
  slug: string;
  name: string;
  description?: string;
  tags: string[];
  kitRef?: string; // storage reference / URI to the .prefab kit
  previewUri?: string; // optional path to a single catalog preview image
}

// --- game-session --------------------------------------------------------

export type SessionStatus = 'created' | 'starting' | 'running' | 'stopped' | 'error';

/**
 * A game-session is a runtime instance of a world. This service is the
 * registry: it records the session, its world, status and settings overrides.
 * The actual runtime is owned by iris-player / the relay daemon.
 */
export interface GameSession {
  id: SessionId;
  worldId: WorldId;
  status: SessionStatus;
  /** Per-session overrides layered over the world's settings. */
  settings: Record<string, unknown>;
  runtimeEndpoint?: string; // where the live runtime is reachable, once started
  createdAt: number;
}
