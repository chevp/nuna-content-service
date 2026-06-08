/**
 * Gateway middleware — the request edge: auth check, logging, error handling.
 * The gateway only routes and guards; domain logic lives in the modules.
 */

import type { ErrorRequestHandler, RequestHandler } from 'express';
import { authMiddleware } from '../../core/auth';
import type { AppContext } from '../../core/context';
import { logger } from '../../shared/utils';

export const requestLogger: RequestHandler = (req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
};

export const auth = (ctx: AppContext): RequestHandler => authMiddleware(ctx.config.auth);

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  logger.error('unhandled error', err);
  const status = typeof err?.status === 'number' ? err.status : 500;
  res.status(status).json({ error: err?.message ?? 'internal error' });
};

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'not found' });
};
