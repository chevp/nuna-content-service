/** Game-session HTTP controller — create/list/fetch sessions and drive status. */

import { Router } from 'express';
import type { AppContext } from '../../core/context';
import type { CreateSessionDto, UpdateSessionDto } from '../../shared/dto';
import { asyncHandler } from '../../shared/utils';
import { SessionService } from './session.service';

export function sessionController(ctx: AppContext): Router {
  const router = Router();
  const service = new SessionService(ctx);

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      res.json(await service.list());
    }),
  );

  // Create a session for a world (404 if the world is unknown).
  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const session = await service.create(req.body as CreateSessionDto);
      if (!session) {
        res.status(404).json({ error: 'world not found' });
        return;
      }
      res.status(201).json(session);
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const session = await service.get(req.params.id);
      if (!session) {
        res.status(404).json({ error: 'session not found' });
        return;
      }
      res.json(session);
    }),
  );

  // Update status / settings / runtime endpoint.
  router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const session = await service.update(req.params.id, req.body as UpdateSessionDto);
      if (!session) {
        res.status(404).json({ error: 'session not found' });
        return;
      }
      res.json(session);
    }),
  );

  // Stop + remove the session record.
  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const ok = await service.delete(req.params.id);
      res.status(ok ? 204 : 404).end();
    }),
  );

  return router;
}
