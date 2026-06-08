/** Scene HTTP controller — define scenes and evaluate them to entity sets. */

import { Router } from 'express';
import type { AppContext } from '../../core/context';
import type { CreateSceneDto } from '../../shared/dto';
import { asyncHandler } from '../../shared/utils';
import { SceneService } from './scene.service';

export function sceneController(ctx: AppContext): Router {
  const router = Router();
  const service = new SceneService(ctx);

  // Create a scene definition.
  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const def = await service.createDefinition(req.body as CreateSceneDto);
      res.status(201).json(def);
    }),
  );

  // Evaluate a scene → entities + assets (e.g. GET /scene/forest).
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const result = await service.evaluate(req.params.id);
      if (!result) {
        res.status(404).json({ error: 'scene not found' });
        return;
      }
      res.json(result);
    }),
  );

  // Update scene membership (rules).
  router.patch(
    '/:id/membership',
    asyncHandler(async (req, res) => {
      const ok = await service.updateMembership(req.params.id, req.body?.rules);
      res.status(ok ? 200 : 404).json({ updated: ok });
    }),
  );

  return router;
}
