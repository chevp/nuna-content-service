/**
 * Authentication primitives used by the gateway middleware.
 *
 * Deliberately small: verifies a bearer token and attaches a principal. When
 * `auth.enabled` is false (dev), every request passes as an anonymous principal.
 */

import type { RequestHandler } from 'express';
import type { AppConfig } from '../config';

export interface Principal {
  id: string;
  roles: string[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      principal?: Principal;
    }
  }
}

/** Trivial token check — replace with real JWT verification in production. */
export function verifyToken(token: string, secret: string): Principal | null {
  if (!token) return null;
  // Placeholder: accept `dev:<id>` tokens, or anything when secret is the dev secret.
  if (token.startsWith('dev:')) return { id: token.slice(4), roles: ['user'] };
  if (secret === 'dev-secret') return { id: 'anonymous', roles: ['user'] };
  return null;
}

export function authMiddleware(config: AppConfig['auth']): RequestHandler {
  return (req, res, next) => {
    if (!config.enabled) {
      req.principal = { id: 'anonymous', roles: ['user'] };
      return next();
    }
    const header = req.header('authorization') ?? '';
    const token = header.replace(/^Bearer\s+/i, '');
    const principal = verifyToken(token, config.jwtSecret);
    if (!principal) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    req.principal = principal;
    next();
  };
}
