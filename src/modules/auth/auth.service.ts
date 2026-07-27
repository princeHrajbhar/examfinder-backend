// modules/auth/auth.service.ts
import bcrypt from 'bcrypt';
import { User, Session } from './auth.model.js';
import { generateSecureToken } from './auth.utils.js';
import { generateAccessTokenForSession } from './auth.jwt.js';
import { AppError, ErrorCode } from '../../errors/AppError.js';
import { logger } from '../../config/logger.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const BCRYPT_ROUNDS        = 12;
const SESSION_EXPIRY_MS    = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_SESSIONS_PER_USER = 5;
const LOGIN_LOCK_ATTEMPTS  = 10;
const LOGIN_LOCK_DURATION_MS = 15 * 60 * 1000; // 15 min

// ─── Types ────────────────────────────────────────────────────────────────────
interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

// ─── Token helpers (sessionId prefix for O(1) lookup) ─────────────────────────
const TOKEN_SEPARATOR = '.';

export function buildToken(sessionId: string, secret: string): string {
  return `${sessionId}${TOKEN_SEPARATOR}${secret}`;
}

export function splitToken(token: string): [string, string] {
  if (!token) return ['', ''];
  const idx = token.indexOf(TOKEN_SEPARATOR);
  if (idx === -1) return ['', ''];
  return [token.slice(0, idx), token.slice(idx + 1)];
}

// ─── Register ─────────────────────────────────────────────────────────────────
export const registerUser = async (payload: {
  name: string;
  email: string;
  password: string;
}) => {
  const { name, email, password } = payload;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('Email already registered', 409, ErrorCode.USER_EXISTS);
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await User.create({
    name,
    email, 
    password: hashedPassword,
  });

  logger.info({ userId: user._id, email }, 'New user registered');
  return user;
};

// ─── Login ────────────────────────────────────────────────────────────────────
export const loginUser = async (
  email: string,
  password: string,
  meta: SessionMeta = {},
) => {
  const user = await User.findOne({ email }).select(
    '+password +failedLoginAttempts +lockedUntil',
  );

  if (!user) {
    await bcrypt.hash(password, BCRYPT_ROUNDS); // timing-safe
    throw new AppError('Invalid credentials', 401, ErrorCode.INVALID_CREDENTIALS);
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const retryAfterSec = Math.ceil(
      (user.lockedUntil.getTime() - Date.now()) / 1000,
    );
    throw new AppError(
      `Account temporarily locked. Try again in ${Math.ceil(retryAfterSec / 60)} minute(s).`,
      429,
      ErrorCode.INVALID_CREDENTIALS,
    );
  }

  const isMatch = await bcrypt.compare(password, user.password ?? '');

  if (!isMatch) {
    const attempts   = user.failedLoginAttempts + 1;
    const shouldLock = attempts >= LOGIN_LOCK_ATTEMPTS;
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          failedLoginAttempts: shouldLock ? 0 : attempts,
          ...(shouldLock && {
            lockedUntil: new Date(Date.now() + LOGIN_LOCK_DURATION_MS),
          }),
        },
      },
    );
    logger.warn({ email, attempts }, 'Failed login attempt');
    throw new AppError('Invalid credentials', 401, ErrorCode.INVALID_CREDENTIALS);
  }

  await User.updateOne(
    { _id: user._id },
    { $set: { failedLoginAttempts: 0, lockedUntil: null } },
  );

  // Prune oldest sessions if cap reached
  const sessionCount = await Session.countDocuments({ userId: user._id });
  if (sessionCount >= MAX_SESSIONS_PER_USER) {
    const oldest = await Session.find({ userId: user._id })
      .sort({ lastUsedAt: 1 })
      .limit(sessionCount - MAX_SESSIONS_PER_USER + 1)
      .select('_id');
    await Session.deleteMany({ _id: { $in: oldest.map((s) => s._id) } });
    logger.info({ userId: user._id }, 'Pruned oldest sessions due to session cap');
  }

  const refreshToken     = generateSecureToken();
  const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);

  const session = await Session.create({
    userId: user._id,
    refreshTokenHash,
    userAgent: meta.userAgent,
    ip:        meta.ip,
    expiresAt: new Date(Date.now() + SESSION_EXPIRY_MS),
    lastUsedAt: new Date(),
  });

  const accessToken = generateAccessTokenForSession(
    user._id.toString(),
    user.role,
    session._id.toString(),
  );

  logger.info({ userId: user._id, sessionId: session._id }, 'User logged in');

  const tokenWithId = buildToken(session._id.toString(), refreshToken);
  return { accessToken, refreshToken: tokenWithId };
};

// ─── Refresh Token ────────────────────────────────────────────────────────────
export const refreshTokenService = async (oldToken: string) => {
  const [sessionId, secret] = splitToken(oldToken);

  if (!sessionId || !secret) {
    throw new AppError('Invalid refresh token format', 401, ErrorCode.TOKEN_INVALID);
  }

  const session = await Session.findById(sessionId).select('+refreshTokenHash');

  if (!session || session.expiresAt < new Date()) {
    logger.warn({ sessionId }, 'Refresh token reuse attempt or session not found');
    throw new AppError('Session not found or expired', 401, ErrorCode.SESSION_NOT_FOUND);
  }

  const isValid = await bcrypt.compare(secret, session.refreshTokenHash);
  if (!isValid) {
    logger.warn(
      { sessionId, userId: session.userId },
      'Refresh token hash mismatch — possible replay attack',
    );
    await Session.deleteOne({ _id: session._id });
    throw new AppError('Invalid refresh token', 401, ErrorCode.TOKEN_INVALID);
  }

  const user = await User.findById(session.userId);
  if (!user) {
    await Session.deleteOne({ _id: session._id });
    throw new AppError('User not found', 401, ErrorCode.USER_NOT_FOUND);
  }

  const newRefreshToken     = generateSecureToken();
  const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, BCRYPT_ROUNDS);

  await Session.updateOne(
    { _id: session._id },
    {
      refreshTokenHash: newRefreshTokenHash,
      lastUsedAt:       new Date(),
      expiresAt:        new Date(Date.now() + SESSION_EXPIRY_MS),
    },
  );

  const newAccessToken = generateAccessTokenForSession(
    user._id.toString(),
    user.role,
    session._id.toString(),
  );

  const newTokenWithId = buildToken(session._id.toString(), newRefreshToken);
  logger.info({ userId: user._id, sessionId: session._id }, 'Token refreshed');

  return { newAccessToken, newRefreshToken: newTokenWithId };
};

// ─── Logout ───────────────────────────────────────────────────────────────────
export const logoutService = async (refreshToken: string) => {
  const [sessionId] = splitToken(refreshToken);
  if (sessionId) {
    await Session.deleteOne({ _id: sessionId });
    logger.info({ sessionId }, 'Session deleted on logout');
  }
};

export const logoutAllService = async (userId: string) => {
  const result = await Session.deleteMany({ userId });
  logger.info({ userId, deleted: result.deletedCount }, 'All sessions terminated');
};

// ─── Change Password ──────────────────────────────────────────────────────────
export const changePassword = async (payload: {
  userId:          string;
  sessionId:       string;
  currentPassword: string;
  newPassword:     string;
}) => {
  const { userId, sessionId, currentPassword, newPassword } = payload;

  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new AppError('User not found', 404, ErrorCode.USER_NOT_FOUND);
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password ?? '');
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 401, ErrorCode.INVALID_CREDENTIALS);
  }

  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await User.updateOne({ _id: userId }, { password: hashedPassword });
  await Session.deleteMany({ userId, _id: { $ne: sessionId } });

  logger.info({ userId }, 'Password changed — other sessions invalidated');
  return { message: 'Password changed successfully.' };
};

// ─── Get active sessions ──────────────────────────────────────────────────────
export const getActiveSessions = async (userId: string) => {
  const sessions = await Session.find({
    userId,
    expiresAt: { $gt: new Date() },
  })
    .select('_id userAgent ip lastUsedAt createdAt')
    .sort({ lastUsedAt: -1 });

  return sessions.map((s) => ({
    id:         s._id,
    userAgent:  s.userAgent,
    ip:         s.ip,
    lastUsedAt: s.lastUsedAt,
    createdAt:  s.createdAt,
  }));
};