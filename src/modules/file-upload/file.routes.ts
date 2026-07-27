import { Router, Request, Response } from 'express';
import { upload } from '../../middlewares/upload.middleware.js';
import { uploadFile, deleteFile } from '../../utils/fileUpload.js';
import { injectAssetUrls, stripAssetBase } from '../../utils/asset.js';
import { logger } from '../../config/logger.js';
import { FileModel, type IFile } from './file.model.js';
import { protect, authorize } from '../../middlewares/auth.middleware.js';
import type { IUploadedFile } from '../../types/uploaded-file.type.js';

const router = Router();

const getResourceType = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'document';
  return 'raw';
};

const toFileDocument = (uploaded: IUploadedFile, folder: string) => ({
  originalName: uploaded.originalName,
  storageKey: uploaded.storageKey,
  path: `/${uploaded.storageKey}`,
  url: uploaded.url,

  // Keep this alias during migration because other modules still read publicId.
  publicId: uploaded.storageKey,

  mimeType: uploaded.mimeType,
  size: uploaded.size,
  folder,
  resourceType: getResourceType(uploaded.mimeType),
  format: uploaded.extension || 'unknown',
  etag: uploaded.etag,
  uploadedAt: uploaded.uploadedAt,
});

const getStoredKey = (file: Pick<IFile, 'storageKey' | 'publicId' | 'path' | 'url'>): string => {
  return (
    file.storageKey ||
    file.publicId ||
    stripAssetBase(file.path) ||
    stripAssetBase(file.url)
  );
};

/** Upload File (Admin Only) */
router.post(
  '/',
  protect,
  authorize('admin'),
  upload.single('file'),
  async (req: Request, res: Response) => {
    let uploadedStorageKey: string | undefined;

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'File is required',
        });
      }

      const uploaded = await uploadFile(req.file, 'uploads');
      uploadedStorageKey = uploaded.storageKey;

      const file = await FileModel.create(toFileDocument(uploaded, 'uploads'));

      return res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: injectAssetUrls(file),
      });
    } catch (error: unknown) {
      if (uploadedStorageKey) {
        await deleteFile(uploadedStorageKey).catch((cleanupError) => {
          logger.warn(
            { err: cleanupError, storageKey: uploadedStorageKey },
            'Failed to clean up uploaded file after database error',
          );
        });
      }

      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'File upload failed',
      });
    }
  },
);

/** Get All Files (Public) */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const files = await FileModel.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: files.length,
      data: injectAssetUrls(files),
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve files',
    });
  }
});

/** Get Single File (Public) */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const file = await FileModel.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: injectAssetUrls(file),
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve file',
    });
  }
});

/** Update File (Admin Only) */
router.put(
  '/:id',
  protect,
  authorize('admin'),
  upload.single('file'),
  async (req: Request, res: Response) => {
    let newStorageKey: string | undefined;

    try {
      const existing = await FileModel.findById(req.params.id);

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'File not found',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'File is required',
        });
      }

      // Upload first. Do not delete the current file until DB persistence succeeds.
      const uploaded = await uploadFile(req.file, 'uploads');
      newStorageKey = uploaded.storageKey;
      const oldStorageKey = getStoredKey(existing);

      existing.set(toFileDocument(uploaded, 'uploads'));
      await existing.save();

      if (oldStorageKey && oldStorageKey !== uploaded.storageKey) {
        await deleteFile(oldStorageKey).catch((deleteError) => {
          logger.warn(
            { err: deleteError, storageKey: oldStorageKey },
            'Failed to delete the previous stored file',
          );
        });
      }

      return res.status(200).json({
        success: true,
        message: 'File updated successfully',
        data: injectAssetUrls(existing),
      });
    } catch (error: unknown) {
      if (newStorageKey) {
        await deleteFile(newStorageKey).catch((cleanupError) => {
          logger.warn(
            { err: cleanupError, storageKey: newStorageKey },
            'Failed to clean up replacement file after update error',
          );
        });
      }

      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'File update failed',
      });
    }
  },
);

/** Delete File (Admin Only) */
router.delete('/:id', protect, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const file = await FileModel.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    const storageKey = getStoredKey(file);

    if (storageKey) {
      await deleteFile(storageKey);
    }

    await file.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'File deletion failed',
    });
  }
});

export default router;