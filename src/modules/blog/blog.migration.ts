// skillo-backend\src\modules\blog\blog.migration.ts
import path from 'path';

import Blog from './blog.model.js';
import type { IUploadedFile } from '../../types/uploaded-file.type.js';

type LegacyFileRecord = Record<string, unknown>;

const mimeTypeFromExtension = (
  extension: string,
): string => {
  const knownTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    txt: 'text/plain',
    mp4: 'video/mp4',
    webm: 'video/webm',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };

  return (
    knownTypes[extension] ||
    'application/octet-stream'
  );
};

const normalizeLegacyFile = (
  rawValue: unknown,
  fallbackDate: Date,
): IUploadedFile | undefined => {
  if (
    !rawValue ||
    typeof rawValue !== 'object' ||
    Array.isArray(rawValue)
  ) {
    return undefined;
  }

  const file = rawValue as LegacyFileRecord;
  const url =
    typeof file.url === 'string'
      ? file.url
      : '';

  const legacyStorageKey =
    typeof file.storageKey === 'string'
      ? file.storageKey
      : typeof file.publicId === 'string'
        ? file.publicId
        : '';

  if (!url || !legacyStorageKey) {
    return undefined;
  }

  const urlName = decodeURIComponent(
    url.split('/').pop() || '',
  );
  const originalName =
    typeof file.originalName === 'string'
      ? file.originalName
      : typeof file.originalFilename === 'string'
        ? file.originalFilename
        : urlName || path.basename(legacyStorageKey);

  const extension =
    typeof file.extension === 'string'
      ? file.extension.toLowerCase()
      : path
          .extname(originalName)
          .replace('.', '')
          .toLowerCase();

  const uploadedAtValue =
    file.uploadedAt ||
    file.createdAt ||
    fallbackDate;

  return {
    url,
    storageKey: legacyStorageKey,
    mimeType:
      typeof file.mimeType === 'string'
        ? file.mimeType
        : mimeTypeFromExtension(extension),
    originalName,
    size:
      typeof file.size === 'number'
        ? file.size
        : typeof file.bytes === 'number'
          ? file.bytes
          : 0,
    extension,
    uploadedAt: new Date(
      uploadedAtValue as string | number | Date,
    ),
    ...(typeof file.etag === 'string'
      ? { etag: file.etag }
      : {}),
    ...(typeof file.width === 'number'
      ? { width: file.width }
      : {}),
    ...(typeof file.height === 'number'
      ? { height: file.height }
      : {}),
    ...(typeof file.duration === 'number'
      ? { duration: file.duration }
      : {}),
    ...(typeof file.pages === 'number'
      ? { pages: file.pages }
      : {}),
  };
};

export const migrateBlogUploadedFiles =
  async (): Promise<{
    scanned: number;
    updated: number;
  }> => {
    const cursor = Blog.collection.find({
      $or: [
        {
          'banner.publicId': {
            $exists: true,
          },
        },
        {
          'files.publicId': {
            $exists: true,
          },
        },
      ],
    });

    let scanned = 0;
    let updated = 0;

    for await (const document of cursor) {
      scanned += 1;

      const fallbackDate = new Date(
        document.createdAt || Date.now(),
      );
      const banner = normalizeLegacyFile(
        document.banner,
        fallbackDate,
      );
      const files = Array.isArray(document.files)
        ? document.files
            .map((file) =>
              normalizeLegacyFile(
                file,
                fallbackDate,
              ),
            )
            .filter(
              (
                file,
              ): file is IUploadedFile =>
                Boolean(file),
            )
        : [];

      const setData: Record<string, unknown> = {
        files,
      };
      const unsetData: Record<string, 1> = {};

      if (banner) {
        setData.banner = banner;
      } else if (document.banner) {
        unsetData.banner = 1;
      }

      await Blog.collection.updateOne(
        { _id: document._id },
        {
          $set: setData,
          ...(Object.keys(unsetData).length
            ? { $unset: unsetData }
            : {}),
        },
      );

      updated += 1;
    }

    return {
      scanned,
      updated,
    };
  };
