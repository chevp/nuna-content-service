/** Small cross-cutting helpers: logger, async route wrapper, ids. */

import { randomBytes } from 'node:crypto';
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

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/** Generate a random base62 identifier (default 12 chars ≈ 71 bits). */
export const base62Id = (size = 12): string => {
  const bytes = randomBytes(size);
  let out = '';
  for (let i = 0; i < size; i += 1) out += BASE62[bytes[i] % 62];
  return out;
};

/** Slugify a name into a stable, url-safe key. */
export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
