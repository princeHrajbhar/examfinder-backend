import { ENV } from '../config/env.js';

const ABSOLUTE_URL = /^https?:\/\//i;

const trimSlashes = (value: string): string =>
  value.replace(/^\/+|\/+$/g, '');

const safeDecodeURIComponent = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const encodeAssetPath = (value: string): string =>
  trimSlashes(value)
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(safeDecodeURIComponent(segment)))
    .join('/');

const getLegacyS3Path = (value: string): string | undefined => {
  if (!ABSOLUTE_URL.test(value)) return undefined;

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const bucket = ENV.AWS_BUCKET_NAME.toLowerCase();
    const region = ENV.AWS_REGION.toLowerCase();

    const virtualHostedRegional = `${bucket}.s3.${region}.amazonaws.com`;
    const virtualHostedGlobal = `${bucket}.s3.amazonaws.com`;
    const pathStyleRegional = `s3.${region}.amazonaws.com`;
    const pathStyleGlobal = 's3.amazonaws.com';

    if (
      hostname === virtualHostedRegional ||
      hostname === virtualHostedGlobal
    ) {
      return trimSlashes(url.pathname);
    }

    if (
      hostname === pathStyleRegional ||
      hostname === pathStyleGlobal
    ) {
      const pathname = trimSlashes(url.pathname);
      const bucketPrefix = `${ENV.AWS_BUCKET_NAME}/`;

      if (pathname.startsWith(bucketPrefix)) {
        return pathname.slice(bucketPrefix.length);
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
};

/**
 * Resolve a bucket key or relative asset path against ASSET_BASE_URL.
 *
 * Legacy S3 URLs are rewritten to ASSET_BASE_URL so old dotted-bucket URLs do
 * not keep producing TLS certificate errors.
 */
export const resolveAssetUrl = (value?: string | null): string => {
  if (!value) return '';

  if (value.startsWith(ENV.ASSET_BASE_URL)) {
    return value;
  }

  const legacyS3Path = getLegacyS3Path(value);

  if (legacyS3Path) {
    return `${ENV.ASSET_BASE_URL}/${encodeAssetPath(legacyS3Path)}`;
  }

  // Preserve genuinely external URLs.
  if (ABSOLUTE_URL.test(value)) {
    return value;
  }

  return `${ENV.ASSET_BASE_URL}/${encodeAssetPath(value)}`;
};

/**
 * Convert the configured asset URL or a legacy S3 URL back into a bucket key.
 * Absolute URLs belonging to another host remain unchanged.
 */
export const stripAssetBase = (value?: string | null): string => {
  if (!value) return '';

  if (value.startsWith(ENV.ASSET_BASE_URL)) {
    return trimSlashes(value.slice(ENV.ASSET_BASE_URL.length));
  }

  return getLegacyS3Path(value) ?? value;
};

const isAssetObject = (object: Record<string, unknown>): boolean =>
  typeof object.storageKey === 'string' ||
  typeof object.publicId === 'string';

const firstNonEmptyString = (
  ...values: unknown[]
): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
};

/**
 * Recursively clone a response and normalize asset subdocuments.
 *
 * Canonical field:
 *   storageKey
 *
 * Legacy field supported during migration:
 *   publicId
 */
export const injectAssetUrls = <T>(payload: T): T => {
  const plain = JSON.parse(JSON.stringify(payload)) as unknown;
  const seen = new WeakSet<object>();

  const walk = (node: unknown): unknown => {
    if (node === null || typeof node !== 'object') return node;
    if (seen.has(node as object)) return node;

    seen.add(node as object);

    if (Array.isArray(node)) {
      return node.map(walk);
    }

    const object = node as Record<string, unknown>;

    if (isAssetObject(object)) {
      const existingUrl = firstNonEmptyString(object.url);

      const storageKey = firstNonEmptyString(
        object.storageKey,
        object.publicId,
        object.path,
        existingUrl ? stripAssetBase(existingUrl) : undefined,
      );

      if (storageKey && !ABSOLUTE_URL.test(storageKey)) {
        const normalizedKey = trimSlashes(storageKey);

        object.storageKey = normalizedKey;
        object.path = `/${normalizedKey}`;
        object.url = resolveAssetUrl(normalizedKey);
      } else if (existingUrl) {
        object.url = resolveAssetUrl(existingUrl);
      }
    }

    for (const key of Object.keys(object)) {
      object[key] = walk(object[key]);
    }

    return object;
  };

  return walk(plain) as T;
};