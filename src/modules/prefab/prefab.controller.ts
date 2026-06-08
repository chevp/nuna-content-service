/** Prefab HTTP controller — register/list/fetch prefab catalogs. */

import { Router } from 'express';
import type { AppContext } from '../../core/context';
import type { CreatePrefabDto } from '../../shared/dto';
import { asyncHandler } from '../../shared/utils';
import { PrefabService } from './prefab.service';

export function prefabController(ctx: AppContext): Router {
  const router = Router();
  const service = new PrefabService(ctx);

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      res.json(await service.list());
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const prefab = await service.register(req.body as CreatePrefabDto);
      res.status(201).json(prefab);
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const prefab = await service.get(req.params.id);
      if (!prefab) {
        res.status(404).json({ error: 'prefab not found' });
        return;
      }
      res.json(prefab);
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
