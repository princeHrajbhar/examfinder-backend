// src/models/blog-category.model.ts

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBlogCategory extends Document {
  name: string;
  slug: string;
}

const BlogCategorySchema = new Schema(
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
  },
  {
    timestamps: true,
  },
);

const BlogCategoryModel: Model<IBlogCategory> =
  mongoose.models.BlogCategory || mongoose.model<IBlogCategory>('BlogCategory', BlogCategorySchema);

export default BlogCategoryModel;
