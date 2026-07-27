import { z } from 'zod';

export const createBlogCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
});

export const updateBlogCategorySchema = createBlogCategorySchema.partial();

export type CreateBlogCategoryInput = z.infer<typeof createBlogCategorySchema>;

export type UpdateBlogCategoryInput = z.infer<typeof updateBlogCategorySchema>;
