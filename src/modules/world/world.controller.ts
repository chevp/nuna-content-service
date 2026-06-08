/**
 * World HTTP controller — publish/list/fetch worlds and resolve them
 * (palette + placements + gating) for a runtime.
 */

import { Router } from 'express';
import type { AppContext } from '../../core/context';
import type { CreateWorldDto, UpdateWorldDto } from '../../shared/dto';
import { asyncHandler } from '../../shared/utils';
import { WorldService } from './world.service';

export function worldController(ctx: AppContext): Router {
  const router = Router();
  const service = new WorldService(ctx);

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      res.json(await service.list());
    }),
  );

  // Publish a world composition (world.json).
  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const world = await service.publish(req.body as CreateWorldDto);
      res.status(201).json(world);
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const world = await service.get(req.params.id);
      if (!world) {
        res.status(404).json({ error: 'world not found' });
        return;
      }
      res.json(world);
    }),
  );

  // Resolve → active placements for given props overrides.
  // Props overrides come from the JSON body (POST) or ?s=<json> (GET).
  router.get(
    '/:id/resolve',
    asyncHandler(async (req, res) => {
      const overrides = req.query.s ? (JSON.parse(String(req.query.s)) as Record<string, unknown>) : {};
      const resolved = await service.resolve(req.params.id, overrides);
      if (!resolved) {
        res.status(404).json({ error: 'world not found' });
        return;
      }
      res.json(resolved);
    }),
  );

  router.post(
    '/:id/resolve',
    asyncHandler(async (req, res) => {
      const resolved = await service.resolve(req.params.id, req.body?.props ?? {});
      if (!resolved) {
        res.status(404).json({ error: 'world not found' });
        return;
      }
      res.json(resolved);
    }),
  );

  router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const world = await service.update(req.params.id, req.body as UpdateWorldDto);
      if (!world) {
        res.status(404).json({ error: 'world not found' });
        return;
      }
      res.json(world);
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
