// modules/lead/lead.model.ts
import mongoose, { Schema, Document } from 'mongoose';

// ─── Interface ────────────────────────────────────────────────────────────────
// This tells TypeScript the shape of a Lead document
export interface ILead extends Document {
  name?: string;                                                 // optional — not every form asks for name
  phone: string;                                                 // required
  email: string;                                                 // required
  course: string;                                               // which course they're interested in
  source: string;                                               // where did the lead come from e.g. "hero-form", "popup"
  pagePath?: string;                                            // URL path e.g. "/product-management"
  pageTitle?: string;                                           // page title at time of submission
  status: 'new' | 'contacted' | 'enrolled' | 'lost';           // lead lifecycle stage
                         
  createdBy?: mongoose.Types.ObjectId;    // which admin/user created this lead
  updatedBy?: mongoose.Types.ObjectId;    // which admin/user last updated this lead
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const leadSchema = new Schema<ILead>(
  {
    name: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    },
    course: {
      type: String,
      required: [true, 'Course is required'],
      trim: true,
    },
    source: {
      type: String,
      required: [true, 'Source is required'],
      trim: true,
      // e.g. "hero-form", "popup", "contact-page", "referral"
    },
    pagePath: {
      type: String,
      trim: true,
    },
    pageTitle: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'enrolled', 'lost'],
      default: 'new',
      // Tracks where the lead is in your sales pipeline
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',      // references your User model
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,   // auto-adds createdAt and updatedAt
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Indexes make queries faster — always index fields you filter/search by
leadSchema.index({ phone: 1 });           // search by phone
leadSchema.index({ email: 1 });           // search by email
leadSchema.index({ status: 1 });          // filter by status
leadSchema.index({ source: 1 });          // filter by source
leadSchema.index({ createdAt: -1 });      // sort by newest first

// ─── Model ────────────────────────────────────────────────────────────────────
export const Lead = mongoose.model<ILead>('Lead', leadSchema);
