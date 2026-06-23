/**
 * multer.js — Multer middleware configuration for handling multipart/form-data uploads.
 * Uses memory storage to keep files in RAM for direct streaming to S3 (no temp disk writes).
 */

import multer from 'multer';

/**
 * memoryStorage — Stores uploaded files as Buffers in memory (no disk I/O).
 * Required for streaming directly to S3 via the shared uploadToS3 utility.
 */
const memoryStorage = multer.memoryStorage();

/**
 * upload — Configured multer instance with memory storage and a 5 MB file size limit.
 * Use upload.fields() in routes to accept named image fields (image1–image4).
 */
const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
  },
});

export default upload;
