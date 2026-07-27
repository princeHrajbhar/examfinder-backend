// skillo-backend/src/modules/blog/blog.validator.ts

import { z } from 'zod';

const BLOG_SLUG_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const FAQSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, 'Question is required')
    .max(500, 'Question is too long'),

  answer: z
    .string()
    .trim()
    .min(1, 'Answer is required')
    .max(5000, 'Answer is too long'),
});

export const SocialMediaLinkSchema = z.object({
  platform: z
    .string()
    .trim()
    .min(1, 'Platform is required')
    .max(100, 'Platform is too long'),

  url: z
    .string()
    .trim()
    .url('Invalid URL format'),
});

export const ResourceLinkSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title is too long'),

  url: z
    .string()
    .trim()
    .url('Invalid URL format'),
});

const titleSchema = z
  .string()
  .trim()
  .min(3, 'Title must be at least 3 characters')
  .max(200, 'Title is too long');

/*
 * For create and update forms.
 *
 * The admin input may contain outside whitespace, so it is trimmed.
 * Uppercase characters are still rejected.
 */
const writableSlugSchema = z
  .string()
  .trim()
  .min(3, 'Slug must be at least 3 characters')
  .max(100, 'Slug is too long')
  .regex(
    BLOG_SLUG_PATTERN,
    'Slug must contain lowercase letters, numbers, and single hyphens only',
  );

/*
 * For public route parameters.
 *
 * Do not trim or lowercase this value. It must match exactly.
 */
const exactRouteSlugSchema = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(100, 'Slug is too long')
  .regex(
    BLOG_SLUG_PATTERN,
    'Invalid blog slug',
  );

const descriptionSchema = z
  .string()
  .trim()
  .min(
    10,
    'Description must be at least 10 characters',
  )
  .max(2000, 'Description is too long');

const categorySchema = z
  .string()
  .trim()
  .min(1, 'Category is required')
  .max(150, 'Category is too long');

const postedBySchema = z
  .string()
  .trim()
  .min(1, 'PostedBy is required')
  .max(200, 'PostedBy is too long');

const keywordSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1)
      .max(100),
  )
  .max(100, 'Too many keywords');

const faqSchema = z
  .array(FAQSchema)
  .max(100, 'Too many FAQs');

const socialMediaLinksSchema = z
  .array(SocialMediaLinkSchema)
  .max(30, 'Too many social media links');

const resourceLinksSchema = z
  .array(ResourceLinkSchema)
  .max(100, 'Too many resource links');

const seoTitleSchema = z
  .string()
  .trim()
  .max(200, 'SEO title is too long');

const seoDescriptionSchema = z
  .string()
  .trim()
  .max(500, 'SEO description is too long');

const contentSchema = z
  .string()
  .min(
    10,
    'Content must be at least 10 characters',
  );

const statusSchema = z.enum([
  'draft',
  'published',
]);

export const createBlogSchema = z.object({
  title: titleSchema,

  slug: writableSlugSchema,

  description: descriptionSchema,

  category: categorySchema,

  keyword: keywordSchema.default([]),

  postingDate: z.coerce
    .date()
    .optional(),

  postedBy: postedBySchema,

  socialMediaLinks:
    socialMediaLinksSchema.default([]),

  resourceLinks:
    resourceLinksSchema.default([]),

  faq: faqSchema.default([]),

  seoTitle: seoTitleSchema.default(''),

  seoDescription:
    seoDescriptionSchema.default(''),

  content: contentSchema,

  status: statusSchema.default('draft'),
});

export const updateBlogSchema = z.object({
  title: titleSchema.optional(),

  slug: writableSlugSchema.optional(),

  description: descriptionSchema.optional(),

  category: categorySchema.optional(),

  keyword: keywordSchema.optional(),

  postingDate: z.coerce
    .date()
    .optional(),

  postedBy: postedBySchema.optional(),

  socialMediaLinks:
    socialMediaLinksSchema.optional(),

  resourceLinks:
    resourceLinksSchema.optional(),

  faq: faqSchema.optional(),

  seoTitle: seoTitleSchema.optional(),

  seoDescription:
    seoDescriptionSchema.optional(),

  content: contentSchema.optional(),

  status: statusSchema.optional(),
});

export const updateBlogFileControlsSchema =
  z.object({
    retainedFileStorageKeys: z
      .array(
        z
          .string()
          .trim()
          .min(1),
      )
      .max(
        10,
        'A blog can retain at most 10 uploaded resources',
      )
      .optional(),

    removeBanner: z
      .boolean()
      .optional()
      .default(false),
  });

export const getBlogsSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10),

  status: statusSchema.optional(),

  category: z
    .string()
    .trim()
    .min(1)
    .optional(),

  search: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .optional(),

  sortBy: z
    .enum([
      'createdAt',
      'postingDate',
      'title',
    ])
    .default('createdAt'),

  sortOrder: z
    .enum(['asc', 'desc'])
    .default('desc'),
});

export const idParamSchema = z.object({
  id: z
    .string()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      'Invalid blog ID',
    ),
});

export const slugParamSchema = z.object({
  slug: exactRouteSlugSchema,
});

export const bulkDeleteBlogsSchema = z.object({
  ids: z
    .array(
      z
        .string()
        .regex(
          /^[0-9a-fA-F]{24}$/,
          'Invalid blog ID',
        ),
    )
    .min(1, 'IDs array is required')
    .max(
      100,
      'You can delete at most 100 blogs at once',
    ),
});

export const updateBlogStatusSchema = z.object({
  status: statusSchema,
});

export type CreateBlogInput = z.infer<
  typeof createBlogSchema
>;

export type UpdateBlogInput = z.infer<
  typeof updateBlogSchema
>;

export type GetBlogsInput = z.infer<
  typeof getBlogsSchema
>;

export type UpdateBlogFileControls = z.infer<
  typeof updateBlogFileControlsSchema
>;