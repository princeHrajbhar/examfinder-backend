import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const optionalTrimmedString = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed || undefined;
  },
  z.string().optional(),
);

const rawEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('production'),

    PORT: z.coerce.number().int().positive().default(5000),

    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .optional(),

    // Database
    MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

    // JWT
    JWT_ACCESS_SECRET: z
      .string()
      .min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),

    JWT_REFRESH_SECRET: z
      .string()
      .min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),

    // CORS
    FRONTEND_URL: z.string().default(''),

    /*
     * Public CDN or path-style S3 base URL.
     *
     * Preferred:
     *   https://sn.shikshanation.com
     *
     * Direct S3 fallback:
     *   https://s3.ap-south-1.amazonaws.com/images.shikshanation.com
     */
    ASSET_BASE_URL: z
      .string()
      .url('ASSET_BASE_URL must be a valid URL')
      .transform((value) => value.replace(/\/+$/, '')),

    // AWS S3
    AWS_REGION: z.string().trim().min(1, 'AWS_REGION is required'),

    // Either variable name may be used.
    AWS_BUCKET_NAME: optionalTrimmedString,
    S3_BUCKET: optionalTrimmedString,

    // Optional top-level key prefix inside the bucket.
    S3_KEY_PREFIX: z
      .string()
      .default('skillo')
      .transform((value) => value.trim().replace(/^\/+|\/+$/g, '')),

    // Credentials are optional when an IAM role is available.
    AWS_ACCESS_KEY_ID: optionalTrimmedString,
    AWS_SECRET_ACCESS_KEY: optionalTrimmedString,

    // Admin seed
    ADMIN_EMAIL: z.string().email().optional(),
    ADMIN_PASSWORD: z.string().optional(),
  })
  .superRefine((data, context) => {
    if (!data.AWS_BUCKET_NAME && !data.S3_BUCKET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AWS_BUCKET_NAME'],
        message: 'AWS_BUCKET_NAME or S3_BUCKET is required',
      });
    }

    const hasAccessKey = Boolean(data.AWS_ACCESS_KEY_ID);
    const hasSecretKey = Boolean(data.AWS_SECRET_ACCESS_KEY);

    if (hasAccessKey !== hasSecretKey) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [
          hasAccessKey ? 'AWS_SECRET_ACCESS_KEY' : 'AWS_ACCESS_KEY_ID',
        ],
        message:
          'AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be provided together',
      });
    }
  })
  .transform((data) => ({
    ...data,
    AWS_BUCKET_NAME: (data.AWS_BUCKET_NAME || data.S3_BUCKET) as string,
  }));

const parsed = rawEnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  // eslint-disable-next-line no-console
  console.error(`\n❌ Invalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

export const ENV = parsed.data;

export const isProd = ENV.NODE_ENV === 'production';
export const isDev = ENV.NODE_ENV === 'development';