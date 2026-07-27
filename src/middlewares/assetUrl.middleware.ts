import { Request, Response, NextFunction } from 'express';
import { injectAssetUrls } from '../utils/asset.js';

/**
 * Response middleware that rewrites every JSON payload so each stored asset
 * (any object carrying a `publicId`) is returned with BOTH a relative `path`
 * and a fully-resolved `url` (merged onto ASSET_BASE_URL).
 *
 * Centralising this here means controllers/services just persist and return the
 * stored `path` — the public CDN URL is computed in one place, so swapping the
 * storage backend (Cloudinary → S3/CloudFront) is a config change, not a code
 * change scattered across every module.
 */
export const assetUrlMiddleware = (_req: Request, res: Response, next: NextFunction): void => {
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => originalJson(injectAssetUrls(body));
  next();
};
