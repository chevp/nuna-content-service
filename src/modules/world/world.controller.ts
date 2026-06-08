/**
 * World HTTP controller — world state and chunk streaming. Entity mutations
 * live under the entity controller; world exposes the read/stream surface.
 */

import { Router } from 'express';
import type { AppContext } from '../../core/context';
import { asyncHandler } from '../../shared/utils';
import { WorldService } from './world.service';

export function worldController(ctx: AppContext): Router {
  const router = Router();
  const service = new WorldService(ctx);

  router.get(
    '/:id/state',
    asyncHandler(async (req, res) => {
      const state = await service.getState(req.params.id);
      if (!state) {
        res.status(404).json({ error: 'world not found' });
        return;
      }
      res.json(state);
    }),
  );

  // Stream entities around a world position: /world/:id/stream?x=&z=&radius=
  router.get(
    '/:id/stream',
    asyncHandler(async (req, res) => {
      const x = Number(req.query.x ?? 0);
      const z = Number(req.query.z ?? 0);
      const radius = Number(req.query.radius ?? 1);
      const entities = await service.stream(x, z, radius);
      res.json({ count: entities.length, entities });
    }),
  );

  return router;
}
