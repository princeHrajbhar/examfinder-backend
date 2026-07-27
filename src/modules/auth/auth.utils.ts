import crypto from 'node:crypto';

/**
 * Generates a cryptographically secure random token (hex string).
 * Used for refresh tokens so they can be hashed before storage.
 */
export const generateSecureToken = (bytes = 32): string => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Constant-time string comparison to prevent timing attacks.
 */
export const safeCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};
