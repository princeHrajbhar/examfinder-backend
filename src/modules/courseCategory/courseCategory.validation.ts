import { z } from 'zod';

export const createCourseCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional(),
});

export const updateCourseCategorySchema = createCourseCategorySchema.partial();

export type CreateCourseCategoryInput = z.infer<typeof createCourseCategorySchema>;

export type UpdateCourseCategoryInput = z.infer<typeof updateCourseCategorySchema>;
