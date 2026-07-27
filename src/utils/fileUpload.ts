import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import path from 'path';
import { randomUUID } from 'crypto';

import s3 from '../config/s3.config.js';
import { ENV } from '../config/env.js';
import type { IUploadedFile } from '../types/uploaded-file.type.js';

const createStorageKey = (
  originalName: string,
  folder: string,
): string => {
  const extension = path.extname(originalName).toLowerCase();
  const uniqueName = `${Date.now()}-${randomUUID()}${extension}`;

  return `${folder.replace(/^\/+|\/+$/g, '')}/${uniqueName}`;
};

export const uploadFile = async (
  file: Express.Multer.File,
  folder: string,
): Promise<IUploadedFile> => {
  if (!file) {
    throw new Error('No file provided');
  }

  const storageKey = createStorageKey(file.originalname, folder);

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: ENV.AWS_BUCKET_NAME,
      Key: storageKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    },
  });

  const result = await upload.done();
  const extension = path
    .extname(file.originalname)
    .replace('.', '')
    .toLowerCase();

  return {
    url: `https://${ENV.AWS_BUCKET_NAME}.s3.${ENV.AWS_REGION}.amazonaws.com/${storageKey}`,
    storageKey,
    mimeType: file.mimetype,
    originalName: file.originalname,
    size: file.size,
    extension,
    uploadedAt: new Date(),
    ...(result.ETag
      ? { etag: result.ETag.replace(/"/g, '') }
      : {}),
  };
};

export const uploadMultipleFiles = async (
  files: Express.Multer.File[],
  folder: string,
): Promise<IUploadedFile[]> => {
  if (!files.length) {
    return [];
  }

  const uploadedFiles: IUploadedFile[] = [];

  try {
    for (const file of files) {
      const uploadedFile = await uploadFile(file, folder);
      uploadedFiles.push(uploadedFile);
    }

    return uploadedFiles;
  } catch (error) {
    await Promise.allSettled(
      uploadedFiles.map((file) => deleteFile(file.storageKey)),
    );

    throw error;
  }
};

export const deleteFile = async (
  storageKey: string,
): Promise<void> => {
  if (!storageKey) {
    return;
  }

  await s3.send(
    new DeleteObjectCommand({
      Bucket: ENV.AWS_BUCKET_NAME,
      Key: storageKey,
    }),
  );
};
