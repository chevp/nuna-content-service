/**
 * Scene builder — evaluates a SceneDefinition into a concrete entity set.
 *
 * A scene is NOT a stored copy of the world. It is a query: a filter
 * (chunk-based, tag-based, or explicit entity list) plus optional rules. The
 * builder turns that definition into entities by pulling from the entity
 * repository / chunk service. The result is runtime-only (the service caches it).
 */

import type { Entity, SceneDefinition, SceneFilter, SceneRule } from '../../shared/types';
import type { EntityRepository } from '../entity/entity.repository';

export interface SceneBuilderDeps {
  repo: EntityRepository;
}

async function selectByFilter(filter: SceneFilter, deps: SceneBuilderDeps): Promise<Entity[]> {
  switch (filter.kind) {
    case 'chunk':
      return deps.repo.findByChunks(filter.chunks);
    case 'entity-list':
      return deps.repo.findByIds(filter.ids);
    case 'tag': {
      // Tags are modelled as a render-only component; filter post-load.
      const all = await deps.repo.findByChunks([]); // no chunk constraint
      return all.filter((e) =>
        e.components?.some(
          (c) => c.componentType === 'tag' && filter.tags.includes(String(c.data.value)),
        ),
      );
    }
    default:
      return [];
  }
}

function applyRule(entities: Entity[], rule: SceneRule): Entity[] {
  switch (rule.op) {
    case 'limit':
      return entities.slice(0, Number(rule.value) || entities.length);
    case 'exclude': {
      const excluded = new Set((rule.value as string[]) ?? []);
      return entities.filter((e) => !excluded.has(e.id));
    }
    case 'include': {
      // No-op here; explicit includes are handled by the entity-list filter.
      return entities;
    }
    default:
      return entities;
  }
}

export async function buildScene(
  def: SceneDefinition,
  deps: SceneBuilderDeps,
): Promise<Entity[]> {
  let entities = await selectByFilter(def.filter, deps);
  for (const rule of def.rules ?? []) {
    entities = applyRule(entities, rule);
  }
  return entities;
}
