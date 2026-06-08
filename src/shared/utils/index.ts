/** Small cross-cutting helpers: logger, async route wrapper, ids. */

import type { RequestHandler } from 'express';

export const logger = {
  info: (msg: string, meta?: unknown) => console.log(`[info] ${msg}`, meta ?? ''),
  warn: (msg: string, meta?: unknown) => console.warn(`[warn] ${msg}`, meta ?? ''),
  error: (msg: string, meta?: unknown) => console.error(`[error] ${msg}`, meta ?? ''),
};

/** Wrap an async express handler so rejections reach the error middleware. */
export const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

let counter = 0;
/** Deterministic-ish id (no Date.now/random dependency at import time). */
export const newId = (prefix = 'id'): string => `${prefix}_${(counter += 1).toString(36)}`;

export const chunkKey = (chunkX: number, chunkY: number): string => `${chunkX}:${chunkY}`;
