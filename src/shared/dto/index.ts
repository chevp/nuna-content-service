/** Request DTOs at the gateway boundary (composition layer). */

import type { Placement, SceneDoc, SessionStatus } from '../types';

// --- world ---------------------------------------------------------------

export interface PlacementInput {
  id?: string;
  scene: string; // scene name
  whenSetting?: string;
  /** Game-specific placement data, opaque to the service. */
  params?: Record<string, unknown>;
}

/** Create/publish a world composition (the world.json payload). */
export interface CreateWorldDto {
  id?: string;
  tenantId: string;
  title: string;
  version?: string;
  comment?: string;
  props?: Record<string, unknown>;
  world: PlacementInput[]; // placements (each names a scene)
}

export type UpdateWorldDto = Partial<Omit<CreateWorldDto, 'id'>>;

// --- scene ---------------------------------------------------------------

export interface CreateSceneDto {
  id?: string;
  tenantId: string;
  name: string;
  version?: string;
  doc: SceneDoc;
}

export type UpdateSceneDto = Partial<Omit<CreateSceneDto, 'id'>>;

// --- prefab --------------------------------------------------------------

export interface CreatePrefabDto {
  tenantId: string;
  slug: string;
  name: string;
  description?: string;
  tags?: string[];
  kitRef?: string;
  previewUri?: string;
}

// --- session -------------------------------------------------------------

export interface CreateSessionDto {
  tenantId: string;
  worldId: string;
  /** Opaque props bag (name, gameMode, maxPlayers, players, backend, …). */
  props?: Record<string, unknown>;
}

export interface UpdateSessionDto {
  status?: SessionStatus;
  /** Replaces the entire props bag. Merge before sending if partial update is needed. */
  props?: Record<string, unknown>;
  runtimeEndpoint?: string;
}

export type { Placement };
