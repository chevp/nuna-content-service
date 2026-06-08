/**
 * Express application factory.
 *
 * Builds the HTTP app from an AppContext: body parsing, the gateway router
 * (which mounts every module), and the gateway error/not-found handlers.
 * Bootstrapping (context construction, server start) lives in main.ts.
 */

import express, { type Express } from 'express';
import type { AppContext } from './core/context';
import { gatewayRouter } from './modules/gateway/routes';
import { errorHandler, notFound } from './modules/gateway/middleware';

export function createApp(ctx: AppContext): Express {
  const app = express();

  app.use(express.json({ limit: '4mb' }));
  app.use('/', gatewayRouter(ctx));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
