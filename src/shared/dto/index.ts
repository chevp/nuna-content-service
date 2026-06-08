/** Request/response DTOs at the gateway boundary. */

import type { ChunkCoord, EntityComponent, SceneFilter, SceneRule } from '../types';

export interface CreateEntityDto {
  type: string;
  posX: number;
  posY: number;
  posZ: number;
  meshId?: string | null;
  components?: EntityComponent[];
}

export interface UpdateEntityDto {
  posX?: number;
  posY?: number;
  posZ?: number;
  meshId?: string | null;
  components?: EntityComponent[];
}

export interface CreateSceneDto {
  name: string;
  filter: SceneFilter;
  rules?: SceneRule[];
}

export interface ChunkQueryDto {
  chunks: ChunkCoord[];
}
