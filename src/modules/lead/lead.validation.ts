// modules/lead/lead.validation.ts
import { z } from 'zod';

// ─── Create Lead ──────────────────────────────────────────────────────────────
// This runs when someone submits a form on the website
export const createLeadSchema = z.object({
  name: z.string().trim().max(100).optional(),

  phone: z
    .string()
    .trim()
    .min(7,  'Phone number too short')
    .max(15, 'Phone number too long'),

  email: z
    .string()
    .trim()
    .email('Invalid email address'),

  course: z
    .string()
    .trim()
    .min(1, 'Course is required')
    .max(200),

  source: z
    .string()
    .trim()
    .min(1, 'Source is required')
    .max(100),

  pagePath:  z.string().trim().max(500).optional(),
  pageTitle: z.string().trim().max(300).optional(),
});

// ─── Update Lead (admin only) ─────────────────────────────────────────────────
// Admin can update status and add notes
export const updateLeadSchema = z.object({
  status: z.enum(['new', 'contacted', 'enrolled', 'lost']).optional(),
  name:   z.string().trim().max(100).optional(),
  phone:  z.string().trim().min(7).max(15).optional(),
  email:  z.string().trim().email().optional(),
  course: z.string().trim().max(200).optional(),
});

// ─── Query / Filter Leads (admin only) ────────────────────────────────────────
// For listing leads with filters
export const queryLeadSchema = z.object({
  status:  z.enum(['new', 'contacted', 'enrolled', 'lost']).optional(),
  source:  z.string().trim().optional(),
  course:  z.string().trim().optional(),
  search:  z.string().trim().optional(), // search by name/email/phone
  page:    z.coerce.number().int().min(1).default(1),
  limit:   z.coerce.number().int().min(1).max(100).default(20),
  sortBy:  z.enum(['createdAt', 'updatedAt', 'status']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Types (auto-generated from schemas) ──────────────────────────────────────
export type CreateLeadInput  = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput  = z.infer<typeof updateLeadSchema>;
export type QueryLeadInput   = z.infer<typeof queryLeadSchema>;
