import type { RequestHandler } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors';
import type { AuthService } from '../services/authService';
import type { AuthUser, Role } from '../types';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

/** Requires a valid `Authorization: Bearer <jwt>` header and attaches `req.user`. */
export function authenticate(authService: AuthService): RequestHandler {
  return (req, _res, next) => {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedError();
    }
    req.user = authService.verifyToken(token);
    next();
  };
}

/** Must run after `authenticate`. */
export function requireRole(role: Role): RequestHandler {
  return (req, _res, next) => {
    if (req.user?.role !== role) {
      throw new ForbiddenError();
    }
    next();
  };
}
