// skillo-backend/src/modules/course/course.validation.ts

import { z } from 'zod';

const courseLevels = [
  'all-levels',
  'beginner',
  'intermediate',
  'advanced',
] as const;

const COURSE_SLUG_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const parseJson = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const normalizeStringArray = (
  value: unknown,
): unknown => {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return undefined;
  }

  const values = Array.isArray(value)
    ? value
    : [value];

  return values
    .flatMap((item) =>
      typeof item === 'string'
        ? item.split(',')
        : [],
    )
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeCourseLevel = (
  value: unknown,
): unknown => {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return value;
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');
};

const optionalString = z.preprocess(
  (value) =>
    value === undefined || value === null
      ? undefined
      : String(value),
  z.string().trim().optional(),
);

const optionalStringArray = z.preprocess(
  normalizeStringArray,
  z.array(z.string().trim()).optional(),
);

const jsonArray = <T extends z.ZodTypeAny>(
  schema: T,
) =>
  z.preprocess(
    parseJson,
    z.array(schema).optional(),
  );

const jsonObject = <T extends z.ZodTypeAny>(
  schema: T,
) =>
  z.preprocess(
    parseJson,
    schema.optional(),
  );

const optionalUrl = z
  .union([
    z.literal(''),
    z.string().url('Invalid URL'),
  ])
  .optional();

const optionalBoolean = z.preprocess(
  (value) => {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return undefined;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }

    return value;
  },
  z.boolean().optional(),
);

const courseLevelSchema = z.preprocess(
  normalizeCourseLevel,
  z.enum(courseLevels).optional(),
);

/*
 * Used when creating or updating a course.
 * Whitespace around admin input is removed before validation.
 */
const writableCourseSlugSchema = z
  .string()
  .trim()
  .min(1, 'Slug is required')
  .max(160, 'Slug is too long')
  .regex(
    COURSE_SLUG_PATTERN,
    'Slug can contain lowercase letters, numbers and single hyphens only',
  );

/*
 * Used for URL route parameters.
 *
 * No trim and no lowercase transformation are used.
 * The URL must match the stored canonical slug exactly.
 */
const exactRouteSlugSchema = z
  .string()
  .min(1, 'Slug is required')
  .max(160, 'Slug is too long')
  .regex(
    COURSE_SLUG_PATTERN,
    'Invalid course slug',
  );

const uploadedFileReferenceSchema = z
  .object({
    storageKey: optionalString,
    url: optionalString,
  })
  .passthrough();

const resourceInputSchema = z.object({
  name: optionalString.default(''),
  type: z
    .enum(['pdf', 'image'])
    .optional()
    .default('pdf'),
  file: uploadedFileReferenceSchema.optional(),
});

const faqSchema = z.object({
  question: optionalString.default(''),
  answer: optionalString.default(''),
});

const highlightSchema = z.object({
  label: optionalString.default(''),
  value: optionalString.default(''),
});

const toolSchema = z.object({
  name: optionalString.default(''),
  iconSlug: optionalString.default(''),
});

const projectSchema = z.object({
  title: optionalString.default(''),
  description: optionalString.default(''),
});

const certificateSchema = z.object({
  description: optionalString.default(''),
  requirements: optionalStringArray.default([]),
});

const testimonialSchema = z.object({
  name: optionalString.default(''),
  role: optionalString.default(''),
  company: optionalString.default(''),
  content: optionalString.default(''),
  rating: z.coerce
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .default(5),
});

const courseBodySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required'),

  slug: writableCourseSlugSchema,

  category: z
    .string()
    .trim()
    .min(1, 'Category is required'),

  subCategory: optionalString,
  shortDescription: optionalString,

  price: z.coerce
    .number()
    .min(0)
    .optional(),

  discountedPrice: z.coerce
    .number()
    .min(0)
    .optional(),

  currency: optionalString.transform(
    (value) => value?.toUpperCase(),
  ),

  purchaseUrl: optionalUrl,

  metaTitle: optionalString,
  metaDescription: optionalString,
  keywords: optionalStringArray,

  status: z
    .enum(['upcoming', 'active', 'ended'])
    .optional(),

  urls: optionalStringArray,

  resources: jsonArray(resourceInputSchema),

  cms: z.string().optional(),

  faqs: jsonArray(faqSchema),

  heroHeadline: optionalString,

  highlights: jsonArray(highlightSchema),

  whatYouWillLearn: optionalStringArray,
  requirements: optionalStringArray,
  whoIsThisFor: optionalStringArray,
  notFor: optionalStringArray,

  tools: jsonArray(toolSchema),

  curriculum: z.preprocess(
    parseJson,
    z
      .array(
        z.record(
          z.string(),
          z.unknown(),
        ),
      )
      .optional(),
  ),

  projects: jsonArray(projectSchema),

  certificate: jsonObject(certificateSchema),

  careerRoles: optionalStringArray,

  testimonials: jsonArray(testimonialSchema),

  level: courseLevelSchema,

  language: optionalString,

  durationWeeks: z.coerce
    .number()
    .int()
    .min(0)
    .optional(),

  format: optionalString,

  removeBanner: optionalBoolean,
});

export const createCourseInputSchema =
  courseBodySchema.transform((data) => ({
    ...data,

    subCategory: data.subCategory ?? '',
    shortDescription:
      data.shortDescription ?? '',

    price: data.price ?? 0,
    discountedPrice:
      data.discountedPrice ?? 0,

    currency: data.currency ?? 'INR',
    purchaseUrl: data.purchaseUrl ?? '',

    metaTitle: data.metaTitle ?? '',
    metaDescription:
      data.metaDescription ?? '',

    keywords: data.keywords ?? [],
    status: data.status ?? 'upcoming',
    urls: data.urls ?? [],

    resources: data.resources ?? [],
    cms: data.cms ?? '',
    faqs: data.faqs ?? [],

    heroHeadline: data.heroHeadline ?? '',
    highlights: data.highlights ?? [],

    whatYouWillLearn:
      data.whatYouWillLearn ?? [],

    requirements:
      data.requirements ?? [],

    whoIsThisFor:
      data.whoIsThisFor ?? [],

    notFor: data.notFor ?? [],
    tools: data.tools ?? [],

    curriculum: data.curriculum ?? [],
    projects: data.projects ?? [],

    certificate:
      data.certificate ?? {
        description: '',
        requirements: [],
      },

    careerRoles:
      data.careerRoles ?? [],

    testimonials:
      data.testimonials ?? [],

    level:
      data.level ?? 'all-levels',

    language:
      data.language ?? 'English',

    durationWeeks:
      data.durationWeeks ?? 0,

    format: data.format ?? '',

    removeBanner:
      data.removeBanner ?? false,
  }));

export const updateCourseSchema =
  courseBodySchema.partial();

export const courseParamsSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      'Invalid course ID',
    ),
});

export const courseSlugSchema = z.object({
  slug: exactRouteSlugSchema,
});

export type CreateCourseInput = z.infer<
  typeof createCourseInputSchema
>;

export type UpdateCourseInput = z.infer<
  typeof updateCourseSchema
>;

export type CourseResourceInput = z.infer<
  typeof resourceInputSchema
>;