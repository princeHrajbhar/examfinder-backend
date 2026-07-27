import { ENV } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDB, disconnectDB } from './config/db.js';
import app from './app.js';
import type { Server } from 'http';

let server: Server;

const start = async (): Promise<void> => {
  await connectDB();

  server = app.listen(ENV.PORT, () => {
    logger.info(`🚀 Server running on port ${ENV.PORT} [${ENV.NODE_ENV}]`);
  });
};

/**
 * Gracefully shut down: stop accepting new connections, close the DB, then exit.
 * Called on SIGTERM/SIGINT (e.g. PM2 restart, deploy) and on fatal errors.
 */
const shutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received — shutting down gracefully...`);
  try {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await disconnectDB();
    logger.info('Shutdown complete.');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception — exiting');
  process.exit(1);
});

start().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
