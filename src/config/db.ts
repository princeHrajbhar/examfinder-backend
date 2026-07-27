import mongoose from 'mongoose';
import { ENV } from './env.js';
import { logger } from './logger.js';

/**
 * Establish the MongoDB connection.
 *
 * Connection-level events are wired up once so transient drops/reconnects are
 * visible in the logs in production rather than failing silently.
 */
export const connectDB = async (): Promise<void> => {
  mongoose.connection.on('connected', () => logger.info('✅ MongoDB connected'));
  mongoose.connection.on('error', (err) => logger.error({ err }, 'MongoDB error'));
  mongoose.connection.on('disconnected', () => logger.warn('⚠️  MongoDB disconnected'));

  mongoose.set('strictQuery', true);

  // Fail fast at boot if the database is unreachable.
  await mongoose.connect(ENV.MONGO_URI, {
    serverSelectionTimeoutMS: 10_000,
  });
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.connection.close();
};
