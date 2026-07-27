// modules/user/user.validation.ts
import { z } from 'zod';

// Base user schema (used for creation)
export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  isVerified: z.boolean().optional().default(false),
  role: z.enum(['user', 'admin']).optional().default('user'),
});

// Update user schema (all fields optional)
export const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters').optional(),
  email: z.string().email('Invalid email format').toLowerCase().trim().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  isVerified: z.boolean().optional(),
  role: z.enum(['user', 'admin']).optional(),
  failedLoginAttempts: z.number().min(0).optional(),
  lockedUntil: z.date().optional().nullable(),
});

// Login attempt schema
export const loginAttemptSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase().trim(),
});

// Query params for filtering - FIXED VERSION
export const userQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(10),

  role: z.enum(['user', 'admin']).optional(),

  isVerified: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;

      if (typeof value === 'boolean') return value;

      return value === 'true';
    }),

  search: z.string().trim().optional(),
});

// ID param schema
export const idParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
});

// Email param schema
export const emailParamSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase().trim(),
});

// Export types
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
export type IdParamInput = z.infer<typeof idParamSchema>;
export type EmailParamInput = z.infer<typeof emailParamSchema>;