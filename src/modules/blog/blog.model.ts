// skillo-backend/src/modules/blog/blog.model.ts

import mongoose, { Schema, model } from 'mongoose';
import type { Document, Model } from 'mongoose';

import type { IUploadedFile } from '../../types/uploaded-file.type.js';

export type BlogStatus = 'draft' | 'published';

export interface IFAQ {
  question: string;
  answer: string;
}

export interface ISocialMediaLink {
  platform: string;
  url: string;
}

export interface IResourceLink {
  title: string;
  url: string;
}

export interface IBlog extends Document {
  title: string;
  slug: string;
  description: string;
  category: string;
  keyword: string[];
  postingDate: Date;
  postedBy: string;
  socialMediaLinks: ISocialMediaLink[];
  resourceLinks: IResourceLink[];
  banner?: IUploadedFile;
  files: IUploadedFile[];
  faq: IFAQ[];
  seoTitle: string;
  seoDescription: string;
  content: string;
  status: BlogStatus;
  createdAt: Date;
  updatedAt: Date;
}

const BLOG_SLUG_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const cleanStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter(
          (item): item is string =>
            typeof item === 'string',
        )
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const UploadedFileSchema = new Schema<IUploadedFile>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },

    storageKey: {
      type: String,
      required: true,
      trim: true,
    },

    mimeType: {
      type: String,
      required: true,
      trim: true,
    },

    originalName: {
      type: String,
      required: true,
      trim: true,
    },

    size: {
      type: Number,
      required: true,
      min: 0,
    },

    extension: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    uploadedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    etag: {
      type: String,
      trim: true,
    },

    width: {
      type: Number,
      min: 0,
    },

    height: {
      type: Number,
      min: 0,
    },

    duration: {
      type: Number,
      min: 0,
    },

    pages: {
      type: Number,
      min: 0,
    },
  },
  {
    _id: false,
    minimize: false,
  },
);

const FAQSchema = new Schema<IFAQ>(
  {
    question: {
      type: String,
      default: '',
      trim: true,
    },

    answer: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const SocialMediaLinkSchema =
  new Schema<ISocialMediaLink>(
    {
      platform: {
        type: String,
        default: '',
        trim: true,
      },

      url: {
        type: String,
        default: '',
        trim: true,
      },
    },
    {
      _id: false,
    },
  );

const ResourceLinkSchema =
  new Schema<IResourceLink>(
    {
      title: {
        type: String,
        default: '',
        trim: true,
      },

      url: {
        type: String,
        default: '',
        trim: true,
      },
    },
    {
      _id: false,
    },
  );

const BlogSchema = new Schema<IBlog>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    /*
     * Do not use:
     *
     * lowercase: true
     * trim: true
     * set: someSlugNormalizer
     *
     * Mongoose setters may also affect findOne() query values.
     */
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      maxlength: 100,
      validate: {
        validator: (value: string): boolean =>
          BLOG_SLUG_PATTERN.test(value),
        message:
          'Slug must contain lowercase letters, numbers, and single hyphens only',
      },
    },

    content: {
      type: String,
      required: true,
      default: '',
    },

    description: {
      type: String,
      default: '',
      trim: true,
    },

    category: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },

    keyword: {
      type: [String],
      default: () => [],
      set: cleanStringArray,
    },

    postingDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    postedBy: {
      type: String,
      default: '',
      trim: true,
    },

    socialMediaLinks: {
      type: [SocialMediaLinkSchema],
      default: () => [],
    },

    resourceLinks: {
      type: [ResourceLinkSchema],
      default: () => [],
    },

    banner: {
      type: UploadedFileSchema,
      default: undefined,
    },

    files: {
      type: [UploadedFileSchema],
      default: () => [],
    },

    faq: {
      type: [FAQSchema],
      default: () => [],
    },

    seoTitle: {
      type: String,
      default: '',
      trim: true,
    },

    seoDescription: {
      type: String,
      default: '',
      trim: true,
    },

    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: true,
    minimize: false,
  },
);

BlogSchema.index({
  title: 'text',
  description: 'text',
  content: 'text',
  keyword: 'text',
});

BlogSchema.index({
  status: 1,
  category: 1,
  postingDate: -1,
});

/*
 * Named export prevents default-import resolution issues.
 * The default export is also kept for existing imports.
 */
export const Blog: Model<IBlog> =
  (mongoose.models.Blog as Model<IBlog> | undefined) ??
  model<IBlog>('Blog', BlogSchema);

export default Blog;