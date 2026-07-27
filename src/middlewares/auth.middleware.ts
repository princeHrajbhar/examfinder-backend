import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyAccessToken } from '../modules/auth/auth.jwt.js';
import { AppError, ErrorCode } from '../errors/AppError.js';

import type { UserRole } from '../modules/auth/auth.model.js';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: UserRole;
    sessionId?: string;
  };
}

// ─── protect ────────────────────────────────────────────────────────────────

export const protect = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  try {
    const token = req.cookies?.accessToken as string | undefined;

    if (!token) {
      return next(new AppError('Authentication required', 401, ErrorCode.TOKEN_INVALID));
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(
        new AppError('Session expired, please log in again', 401, ErrorCode.TOKEN_EXPIRED),
      );
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid token', 401, ErrorCode.TOKEN_INVALID));
    }
    next(new AppError('Authentication failed', 401, ErrorCode.TOKEN_INVALID));
  }
};

// ─── authorize ──────────────────────────────────────────────────────────────

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403, ErrorCode.FORBIDDEN));
    }
    next();
  };
};
