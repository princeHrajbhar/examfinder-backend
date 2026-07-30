import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { ENV } from './config/env.js';
import { logger } from './config/logger.js';
import { globalErrorHandler } from './middlewares/error.middleware.js';
import { assetUrlMiddleware } from './middlewares/assetUrl.middleware.js';

import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/user/user.routes.js';
import courseRoutes from './modules/course/course.route.js';
import fileRoutes from './modules/file-upload/file.routes.js';
import blogRoutes from './modules/blog/blog.route.js';
import blogCategoryRoutes from './modules/blogCategory/blogCategory.routes.js';
import courseCategoryRoutes from './modules/courseCategory/courseCategory.routes.js';
import leadRoutes from './modules/lead/lead.routes.js';


const app: Application = express();

// Trust the reverse proxy (Nginx/Hostinger) so secure cookies and req.ip work.
app.set('trust proxy', 1);

// ─── Security & performance ──────────────────────────────────────────────────
app.use(helmet());
app.use(compression());
// ─── CORS ────────────────────────────────────────────────────────────────────
// Allowed origins: built-in dev origins plus any comma-separated FRONTEND_URL.
const normalizeOrigin = (o: string) => o.trim().replace(/\/+$/, '');

const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://skillo-frontend.vercel.app',
  'https://skillo-frontend-five.vercel.app',
  'https://examnotify-frontend-lnx8xnc1v-princehrajbhars-projects.vercel.app/'
];

const envOrigins = ENV.FRONTEND_URL.split(',').map(normalizeOrigin).filter(Boolean);

const allowedOrigins = Array.from(
  new Set([...DEV_ORIGINS.map(normalizeOrigin), ...envOrigins]),
);

logger.info({ allowedOrigins }, '🌐 CORS allowed origins');

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (curl, health checks) with no origin.
      if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) {
        return callback(null, true);
      }
      logger.warn({ origin }, '⛔ CORS blocked origin');
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  }),
);

// ─── Body parsers ────────────────────────────────────────────────────────────
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Resolve stored asset paths → full CDN urls on every JSON response.
app.use(assetUrlMiddleware);

// ─── Health checks ───────────────────────────────────────────────────────────
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'Skillo Backend is operational' });
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'skillo-backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─── API routes ──────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/files', fileRoutes);
app.use('/api/v1/blogs', blogRoutes);
app.use('/api/v1/blogcategory', blogCategoryRoutes);
app.use('/api/v1/coursecategory', courseCategoryRoutes);
app.use('/api/v1/leads', leadRoutes);


// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

// ─── Global error handler (must be last) ─────────────────────────────────────
app.use(globalErrorHandler);

export default app;
