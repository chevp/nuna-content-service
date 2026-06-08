/**
 * Gateway routes — mounts every module controller under one router.
 *
 * This is the single internal entry point: Client → Gateway → modules.
 */

import { Router } from 'express';
import type { AppContext } from '../../core/context';
import { ROUTES } from '../../shared/constants';
import { prefabController } from '../prefab/prefab.controller';
import { sceneController } from '../scene/scene.controller';
import { sessionController } from '../session/session.controller';
import { worldController } from '../world/world.controller';
import { auth, requestLogger } from './middleware';

export function gatewayRouter(ctx: AppContext): Router {
  const router = Router();

  router.use(requestLogger);
  router.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Everything below the gateway requires an authenticated principal.
  router.use(auth(ctx));

  router.use(ROUTES.world, worldController(ctx));
  router.use(ROUTES.scene, sceneController(ctx));
  router.use(ROUTES.prefab, prefabController(ctx));
  router.use(ROUTES.session, sessionController(ctx));

  return router;
}
