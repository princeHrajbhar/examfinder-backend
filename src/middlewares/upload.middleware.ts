//  recorded-course\skillo-backend\src\middleware\upload.ts

import multer from 'multer';

const storage = multer.memoryStorage();

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  try {
    if (!file) {
      return cb(new Error('No file received'));
    }

    if (!file.originalname) {
      return cb(new Error('Invalid file'));
    }

    cb(null, true);
  } catch (error) {
    cb(error as Error);
  }
};

export const upload = multer({
  storage,

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 20,
  },

  fileFilter,
});
