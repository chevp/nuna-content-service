/** Asset HTTP controller — lookup + mesh/material resolution. */

import { Router } from 'express';
import type { AppContext } from '../../core/context';
import { asyncHandler } from '../../shared/utils';
import { AssetService } from './asset.service';

export function assetController(ctx: AppContext): Router {
  const router = Router();
  const service = new AssetService(ctx);

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const asset = await service.get(req.params.id);
      if (!asset) {
        res.status(404).json({ error: 'asset not found' });
        return;
      }
      res.json(asset);
    }),
  );

  router.get(
    '/:id/mesh',
    asyncHandler(async (req, res) => {
      const resolved = await service.resolveMesh(req.params.id);
      if (!resolved) {
        res.status(404).json({ error: 'mesh not found' });
        return;
      }
      res.json(resolved);
    }),
  );

  return router;
}
