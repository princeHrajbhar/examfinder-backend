import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// ─── Common response formatter ────────────────────────────────────────────────

const rateLimitHandler = (_req: Request, res: Response) => {
  res.status(429).json({
    status: 'fail',
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Please try again later.',
  });
};

// ─── Limiter definitions ──────────────────────────────────────────────────────

/**
 * Strict limiter for login: 10 attempts per 15 min per IP.
 * This is the first line of defence against credential stuffing.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skipSuccessfulRequests: true, // only count failures toward the limit
});

/**
 * General auth limiter for non-sensitive auth routes (refresh, logout).
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});
