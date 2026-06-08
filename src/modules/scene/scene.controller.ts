/** Scene HTTP controller — CRUD over authored scene documents. */

import { Router } from 'express';
import type { AppContext } from '../../core/context';
import type { CreateSceneDto, UpdateSceneDto } from '../../shared/dto';
import { asyncHandler } from '../../shared/utils';
import { SceneService } from './scene.service';

export function sceneController(ctx: AppContext): Router {
  const router = Router();
  const service = new SceneService(ctx);

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      res.json(await service.list());
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const scene = await service.create(req.body as CreateSceneDto);
      res.status(201).json(scene);
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const scene = await service.get(req.params.id);
      if (!scene) {
        res.status(404).json({ error: 'scene not found' });
        return;
      }
      res.json(scene);
    }),
  );

  router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const scene = await service.update(req.params.id, req.body as UpdateSceneDto);
      if (!scene) {
        res.status(404).json({ error: 'scene not found' });
        return;
      }
      res.json(scene);
    }),
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const ok = await service.delete(req.params.id);
      res.status(ok ? 204 : 404).end();
    }),
  );

  return router;
}
