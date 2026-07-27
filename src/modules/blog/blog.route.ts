import { Router } from 'express';
import multer from 'multer';

import blogController from './blog.controller.js';
import {
  authorize,
  protect,
} from '../../middlewares/auth.middleware.js';

const router = Router();

const allowedResourceMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 11,
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (
      file.fieldname === 'banner' &&
      !file.mimetype.startsWith('image/')
    ) {
      callback(
        new Error(
          'Banner must be an image file.',
        ),
      );
      return;
    }

    if (
      file.fieldname === 'resources' &&
      !file.mimetype.startsWith('image/') &&
      !file.mimetype.startsWith('video/') &&
      !allowedResourceMimeTypes.has(
        file.mimetype,
      )
    ) {
      callback(
        new Error(
          'Unsupported resource file type.',
        ),
      );
      return;
    }

    callback(null, true);
  },
});

const blogUpload = upload.fields([
  {
    name: 'banner',
    maxCount: 1,
  },
  {
    name: 'resources',
    maxCount: 10,
  },
]);

// Public routes
router.get('/', blogController.getBlogs);
router.get('/stats', blogController.getBlogStats);
router.get(
  '/slug/:slug',
  blogController.getBlogBySlug,
);
router.get('/:id', blogController.getBlogById);

// Admin routes
router.post(
  '/',
  protect,
  authorize('admin'),
  blogUpload,
  blogController.createBlog,
);

router.put(
  '/:id',
  protect,
  authorize('admin'),
  blogUpload,
  blogController.updateBlog,
);

// PATCH is also supported so the client can use partial updates.
router.patch(
  '/:id',
  protect,
  authorize('admin'),
  blogUpload,
  blogController.updateBlog,
);

router.delete(
  '/:id',
  protect,
  authorize('admin'),
  blogController.deleteBlog,
);

router.post(
  '/bulk-delete',
  protect,
  authorize('admin'),
  blogController.deleteMultipleBlogs,
);

router.patch(
  '/:id/status',
  protect,
  authorize('admin'),
  blogController.updateBlogStatus,
);

export default router;
