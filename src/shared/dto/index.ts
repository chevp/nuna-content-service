/** Request DTOs at the gateway boundary (composition layer). */

import type { Placement, SceneDoc, SessionStatus, Vec3 } from '../types';

// --- world ---------------------------------------------------------------

export interface PlacementInput {
  id?: string;
  scene: string; // scene name
  position: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
  whenSetting?: string;
}

/** Create/publish a world composition (the world.json payload). */
export interface CreateWorldDto {
  id?: string;
  title: string;
  version?: string;
  comment?: string;
  settings?: Record<string, unknown>;
  world: PlacementInput[]; // placements (each names a scene)
}

export type UpdateWorldDto = Partial<Omit<CreateWorldDto, 'id'>>;

// --- scene ---------------------------------------------------------------

export interface CreateSceneDto {
  id?: string;
  name: string;
  version?: string;
  doc: SceneDoc;
}

export type UpdateSceneDto = Partial<Omit<CreateSceneDto, 'id'>>;

// --- prefab --------------------------------------------------------------

export interface CreatePrefabDto {
  slug: string;
  name: string;
  description?: string;
  tags?: string[];
  kitRef?: string;
}

// --- session -------------------------------------------------------------

export interface CreateSessionDto {
  worldId: string;
  settings?: Record<string, unknown>;
}

export interface UpdateSessionDto {
  status?: SessionStatus;
  settings?: Record<string, unknown>;
  runtimeEndpoint?: string;
}

export type { Placement };
