import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICourseCategory extends Document {
  name: string;
  slug: string;
  description?: string;
}

const CourseCategorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const CourseCategoryModel: Model<ICourseCategory> =
  mongoose.models.CourseCategory ||
  mongoose.model<ICourseCategory>('CourseCategory', CourseCategorySchema);

export default CourseCategoryModel;
