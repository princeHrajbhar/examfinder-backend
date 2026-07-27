// skillo-backend/src/modules/course/course.model.ts

import mongoose, { Model, Schema, model } from 'mongoose';

import {
  ICertificate,
  ICourse,
  ICurriculumSection,
  IFAQ,
  IHighlight,
  IProject,
  IResource,
  ITestimonial,
  ITool,
  IUploadedFile,
} from './course.type.js';

const cleanStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
};

const UploadedFileSchema = new Schema<IUploadedFile>(
  {
    url: {
      type: String,
      default: '',
      trim: true,
    },

    storageKey: {
      type: String,
      default: '',
      trim: true,
    },

    mimeType: {
      type: String,
      default: 'application/octet-stream',
      trim: true,
    },

    originalName: {
      type: String,
      default: '',
      trim: true,
    },

    size: {
      type: Number,
      default: 0,
      min: 0,
    },

    extension: {
      type: String,
      default: '',
      trim: true,
    },

    uploadedAt: {
      type: Date,
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
  },
);

const ResourceSchema = new Schema<IResource>(
  {
    name: {
      type: String,
      default: '',
      trim: true,
    },

    type: {
      type: String,
      enum: ['pdf', 'image'],
      default: 'pdf',
    },

    file: {
      type: UploadedFileSchema,
      default: () => ({}),
    },
  },
  {
    _id: false,
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

const HighlightSchema = new Schema<IHighlight>(
  {
    label: {
      type: String,
      default: '',
      trim: true,
    },

    value: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const ToolSchema = new Schema<ITool>(
  {
    name: {
      type: String,
      default: '',
      trim: true,
    },

    iconSlug: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const ProjectSchema = new Schema<IProject>(
  {
    title: {
      type: String,
      default: '',
      trim: true,
    },

    description: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const CertificateSchema = new Schema<ICertificate>(
  {
    description: {
      type: String,
      default: '',
      trim: true,
    },

    requirements: {
      type: [String],
      default: () => [],
      set: cleanStringArray,
    },
  },
  {
    _id: false,
  },
);

const TestimonialSchema = new Schema<ITestimonial>(
  {
    name: {
      type: String,
      default: '',
      trim: true,
    },

    role: {
      type: String,
      default: '',
      trim: true,
    },

    company: {
      type: String,
      default: '',
      trim: true,
    },

    content: {
      type: String,
      default: '',
      trim: true,
    },

    rating: {
      type: Number,
      default: 5,
      min: 1,
      max: 5,
    },
  },
  {
    _id: false,
  },
);

const CurriculumSectionSchema = new Schema<ICurriculumSection>(
  {},
  {
    _id: false,
    strict: false,
    minimize: false,
  },
);

const CourseSchema = new Schema<ICourse>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    /*
     * Important:
     * Do not use lowercase, trim, or a custom setter here.
     *
     * Mongoose can apply string setters to query values, which would cause
     * "Data-Analytics-Course" to be queried as "data-analytics-course".
     */
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      validate: {
        validator: (value: string): boolean =>
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
        message:
          'Slug must contain only lowercase letters, numbers, and single hyphens',
      },
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    subCategory: {
      type: String,
      default: '',
      trim: true,
    },

    shortDescription: {
      type: String,
      default: '',
      trim: true,
    },

    price: {
      type: Number,
      default: 0,
      min: 0,
    },

    discountedPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },

    purchaseUrl: {
      type: String,
      default: '',
      trim: true,
    },

    bannerImage: {
      type: UploadedFileSchema,
      default: undefined,
    },

    metaTitle: {
      type: String,
      default: '',
      trim: true,
    },

    metaDescription: {
      type: String,
      default: '',
      trim: true,
    },

    keywords: {
      type: [String],
      default: () => [],
      set: cleanStringArray,
    },

    status: {
      type: String,
      enum: ['upcoming', 'active', 'ended'],
      default: 'upcoming',
      index: true,
    },

    urls: {
      type: [String],
      default: () => [],
      set: cleanStringArray,
    },

    resources: {
      type: [ResourceSchema],
      default: () => [],
    },

    cms: {
      type: String,
      default: '',
    },

    faqs: {
      type: [FAQSchema],
      default: () => [],
    },

    heroHeadline: {
      type: String,
      default: '',
      trim: true,
    },

    highlights: {
      type: [HighlightSchema],
      default: () => [],
    },

    whatYouWillLearn: {
      type: [String],
      default: () => [],
      set: cleanStringArray,
    },

    requirements: {
      type: [String],
      default: () => [],
      set: cleanStringArray,
    },

    whoIsThisFor: {
      type: [String],
      default: () => [],
      set: cleanStringArray,
    },

    notFor: {
      type: [String],
      default: () => [],
      set: cleanStringArray,
    },

    tools: {
      type: [ToolSchema],
      default: () => [],
    },

    curriculum: {
      type: [CurriculumSectionSchema],
      default: () => [],
    },

    projects: {
      type: [ProjectSchema],
      default: () => [],
    },

    certificate: {
      type: CertificateSchema,
      default: () => ({
        description: '',
        requirements: [],
      }),
    },

    careerRoles: {
      type: [String],
      default: () => [],
      set: cleanStringArray,
    },

    testimonials: {
      type: [TestimonialSchema],
      default: () => [],
    },

    level: {
      type: String,
      enum: ['all-levels', 'beginner', 'intermediate', 'advanced'],
      default: 'all-levels',
    },

    language: {
      type: String,
      default: 'English',
      trim: true,
    },

    durationWeeks: {
      type: Number,
      default: 0,
      min: 0,
    },

    format: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: true,
    minimize: false,
  },
);

CourseSchema.index({
  title: 'text',
  shortDescription: 'text',
});

CourseSchema.index({
  category: 1,
  status: 1,
});

const Course: Model<ICourse> =
  (mongoose.models.Course as Model<ICourse> | undefined) ??
  model<ICourse>('Course', CourseSchema);

export default Course;