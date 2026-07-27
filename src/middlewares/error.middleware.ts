import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';
import { logger } from '../config/logger.js';

export const globalErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  // ── Mongoose duplicate key ────────────────────────────────────────────────
  if (isMongooseDuplicateKeyError(err)) {
    res.status(409).json({
      status: 'fail',
      code: 'USER_EXISTS',
      message: 'A user with that email already exists',
    });
    return;
  }

  // ── Mongoose validation error ─────────────────────────────────────────────
  if (isMongooseValidationError(err)) {
    const messages = Object.values((err as any).errors)
      .map((e: any) => e.message)
      .join(', ');
    res.status(400).json({ status: 'fail', code: 'VALIDATION_ERROR', message: messages });
    return;
  }

  // ── Known operational errors ──────────────────────────────────────────────
  if (err instanceof AppError) {
    // Log 5xx operational errors as warnings (they're expected, but track them)
    if (err.statusCode >= 500) {
      logger.warn({ err, req: sanitiseReq(req) }, 'Operational server error');
    }
    res.status(err.statusCode).json({
      status: err.statusCode < 500 ? 'fail' : 'error',
      code: err.code,
      message: err.message,
    });
    return;
  }

  // ── Unknown errors — never leak internals ─────────────────────────────────
  logger.error({ err, req: sanitiseReq(req) }, 'Unhandled error');

  const isDev = process.env.NODE_ENV === 'development';
  res.status(500).json({
    status: 'error',
    code: 'INTERNAL',
    message: 'Internal server error',
    ...(isDev &&
      err instanceof Error && {
        detail: err.message,
        stack: err.stack,
      }),
  });
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isMongooseDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as any).code === 11000;
}

function isMongooseValidationError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as any).name === 'ValidationError';
}

/** Strip sensitive fields before logging the request. */
function sanitiseReq(req: Request) {
  return {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };
}
