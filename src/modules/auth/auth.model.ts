import mongoose, { Schema, Document } from 'mongoose';

// ─── Shared timestamps mixin ──────────────────────────────────────────────────
interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

// ─── Session ─────────────────────────────────────────────────────────────────

export interface ISession extends Document, Timestamps {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  /**
   * bcrypt hash of the actual refresh token.
   * Never store the plaintext token.
   */
  refreshTokenHash: string;
  userAgent?: string;
  ip?: string;
  expiresAt: Date;
  lastUsedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    refreshTokenHash: { type: String, required: true, select: false },
    userAgent: String,
    ip: String,
    expiresAt: { type: Date, required: true },
    lastUsedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL cleanup
sessionSchema.index({ userId: 1 });

export const Session = mongoose.model<ISession>('Session', sessionSchema);

// ─── User ─────────────────────────────────────────────────────────────────────

export type UserRole = 'user' | 'admin';

export interface IUser extends Document, Timestamps {
  _id: mongoose.Types.ObjectId;
  name: string;                          // ← added
  email: string;
  password?: string;
  isVerified: boolean;
  role: UserRole;
  /** Tracks consecutive failed login attempts for account-level lockout */
  failedLoginAttempts: number;
  /** ISO timestamp of last failed login — used to reset the counter after a window */
  lockedUntil?: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, trim: true, default: '' },  // ← added
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    isVerified: { type: Boolean, default: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
  },
  { timestamps: true },
);

export const User = mongoose.model<IUser>('User', userSchema);