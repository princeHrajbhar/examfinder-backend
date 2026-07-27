import multer from 'multer';
import path from 'node:path';

const storage = multer.memoryStorage();

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_FILES_PER_REQUEST = 20;

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const BLOG_RESOURCE_MIME_TYPES = new Set([
  ...IMAGE_MIME_TYPES,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const BLOG_RESOURCE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.avif',
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.mp4',
  '.webm',
  '.mov',
  '.avi',
  '.mkv',
]);

const reject = (
  callback: multer.FileFilterCallback,
  message: string,
): void => {
  callback(new Error(message));
};

const courseFileFilter: multer.Options['fileFilter'] = (
  _req,
  file,
  callback,
) => {
  try {
    if (!file?.originalname) {
      reject(callback, 'Invalid file');
      return;
    }

    const allowed =
      file.mimetype === 'application/pdf' ||
      file.mimetype.startsWith('image/');

    if (!allowed) {
      reject(
        callback,
        `Unsupported file type "${file.mimetype}". Course uploads support images and PDF files only.`,
      );
      return;
    }

    callback(null, true);
  } catch (error) {
    callback(error as Error);
  }
};

const blogFileFilter: multer.Options['fileFilter'] = (
  _req,
  file,
  callback,
) => {
  try {
    if (!file?.originalname) {
      reject(callback, 'Invalid file');
      return;
    }

    if (file.fieldname === 'banner') {
      if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
        reject(
          callback,
          'Blog banner must be a JPG, PNG, WEBP, GIF, or AVIF image.',
        );
        return;
      }

      callback(null, true);
      return;
    }

    if (file.fieldname === 'resources') {
      const extension = path.extname(file.originalname).toLowerCase();
      const isVideo = file.mimetype.startsWith('video/');
      const allowed =
        isVideo ||
        BLOG_RESOURCE_MIME_TYPES.has(file.mimetype) ||
        BLOG_RESOURCE_EXTENSIONS.has(extension);

      if (!allowed) {
        reject(
          callback,
          `Unsupported blog resource "${file.originalname}". Allowed types: images, videos, PDF, DOC, DOCX, and TXT.`,
        );
        return;
      }

      callback(null, true);
      return;
    }

    reject(callback, `Unexpected upload field "${file.fieldname}".`);
  } catch (error) {
    callback(error as Error);
  }
};

const createMemoryUpload = (
  fileFilter: multer.Options['fileFilter'],
): multer.Multer =>
  multer({
    storage,
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: MAX_FILES_PER_REQUEST,
    },
    fileFilter,
  });

/**
 * Course upload middleware.
 *
 * Course resources are restricted to images and PDFs because the course
 * resource model only supports the `image` and `pdf` resource types.
 */
export const upload = createMemoryUpload(courseFileFilter);

/**
 * Blog upload middleware.
 *
 * Banner: images only.
 * Resources: images, videos, PDF, DOC, DOCX, and TXT.
 */
export const blogUpload = createMemoryUpload(blogFileFilter);