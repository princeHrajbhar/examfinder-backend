// 1. Define the error codes using 'as const' for strict type safety
export const ErrorCode = {
  // Auth
  USER_EXISTS: 'USER_EXISTS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_NOT_VERIFIED: 'ACCOUNT_NOT_VERIFIED',
  // OTP
  OTP_NOT_FOUND: 'OTP_NOT_FOUND',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_INVALID: 'OTP_INVALID',
  OTP_MAX_ATTEMPTS: 'OTP_MAX_ATTEMPTS',
  OTP_COOLDOWN: 'OTP_COOLDOWN',
  // Session / Token
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  SESSION_LIMIT_REACHED: 'SESSION_LIMIT_REACHED',
  // General
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL: 'INTERNAL',
  BAD_REQUEST: 'BAD_REQUEST',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
} as const;

// Create a TypeScript type from the object values
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// 2. Single definition of AppError
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: ErrorCode, isOperational = true) {
    super(message);

    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}
