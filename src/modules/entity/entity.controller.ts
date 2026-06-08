/**
 * Entity HTTP controller. Thin: validates input shape, delegates to the
 * service, maps results to responses.
 */

import { Router } from 'express';
import type { AppContext } from '../../core/context';
import type { CreateEntityDto, UpdateEntityDto } from '../../shared/dto';
import { asyncHandler } from '../../shared/utils';
import { EntityService } from './entity.service';

export function entityController(ctx: AppContext): Router {
  const router = Router();
  const service = new EntityService(ctx);

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const entity = await service.get(req.params.id);
      if (!entity) {
        res.status(404).json({ error: 'entity not found' });
        return;
      }
      res.json(entity);
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const entity = await service.create(req.body as CreateEntityDto);
      res.status(201).json(entity);
    }),
  );

  router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const entity = await service.update(req.params.id, req.body as UpdateEntityDto);
      if (!entity) {
        res.status(404).json({ error: 'entity not found' });
        return;
      }
      res.json(entity);
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
