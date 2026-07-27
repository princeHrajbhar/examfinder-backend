import mongoose, { Schema, Document } from 'mongoose';

export interface IFile extends Document {
  originalName: string;

  /** Canonical S3 object key, for example uploads/uuid.webp. */
  storageKey: string;

  /** Relative asset path, for example /uploads/uuid.webp. */
  path?: string;

  /** Resolved CDN/S3 URL. */
  url?: string;

  /** Legacy key retained while old records are migrated. */
  publicId?: string;

  mimeType: string;
  size: number;
  folder: string;
  resourceType: string;
  format: string;
  etag?: string;
  uploadedAt: Date;
}

const fileSchema = new Schema<IFile>(
  {
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    storageKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    path: {
      type: String,
    },
    url: {
      type: String,
    },
    publicId: {
      type: String,
      index: true,
      sparse: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    folder: {
      type: String,
      default: 'uploads',
    },
    resourceType: {
      type: String,
      required: true,
    },
    format: {
      type: String,
      required: true,
    },
    etag: {
      type: String,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

export const FileModel = mongoose.model<IFile>('File', fileSchema);