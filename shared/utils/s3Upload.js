/**
 * s3Upload.js — Reusable AWS S3 upload utility (SDK v3).
 * Moved from backend/services/s3Upload.js into shared/ so any service can use it.
 *
 * Supports: upload, replace (delete old + upload new), delete.
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import fs from "fs/promises";
import { createLogger } from "./logger.js";

const logger = createLogger("s3-upload");

/** s3Client — Lazily initialised singleton S3 client. */
let s3Client = null;

/**
 * getS3Client — Initialises and returns the S3 client singleton.
 * Reads credentials from environment variables at call time (not module load time).
 */
const getS3Client = () => {
  if (s3Client) return s3Client;

  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "AWS S3 credentials not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY."
    );
  }

  s3Client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  logger.info("AWS S3 client initialised", { region });
  return s3Client;
};

/**
 * getPublicUrl — Constructs the public S3 object URL from bucket + key.
 * @param {string} key - S3 object key (path inside the bucket)
 */
const getPublicUrl = (key) => {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION;
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

/**
 * uploadToS3 — Uploads a multer file object to S3 and returns the public URL.
 * Supports both memory storage (file.buffer) and disk storage (file.path).
 * @param {Express.Multer.File} file - Multer file object
 * @param {string} folder - S3 folder/prefix (e.g. "products", "categories")
 * @returns {Promise<string>} Public S3 URL of the uploaded object
 */
const uploadToS3 = async (file, folder = "uploads") => {
  const client = getS3Client();
  const bucket = process.env.AWS_S3_BUCKET;

  if (!bucket) {
    throw new Error("AWS_S3_BUCKET environment variable is not set.");
  }

  // Sanitise filename and generate a unique key to avoid collisions
  const sanitisedName = file.originalname.replace(/\s+/g, "-").toLowerCase();
  const key = `${folder}/${Date.now()}-${sanitisedName}`;

  // Support both memory storage (buffer) and disk storage (path)
  const fileBuffer = file.buffer || (await fs.readFile(file.path));

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: file.mimetype,
    })
  );

  // Clean up temp file if it was stored on disk by multer
  if (file.path) {
    await fs.unlink(file.path).catch(() => {});
  }

  const url = getPublicUrl(key);
  logger.info("File uploaded to S3", { key, folder });
  return url;
};

/**
 * deleteFromS3 — Deletes an object from S3 by its full public URL.
 * Extracts the key from the URL automatically.
 * @param {string} fileUrl - Full S3 URL of the file to delete
 */
const deleteFromS3 = async (fileUrl) => {
  const client = getS3Client();
  const bucket = process.env.AWS_S3_BUCKET;

  // Extract the key from the URL (everything after the bucket domain)
  const url = new URL(fileUrl);
  const key = url.pathname.slice(1); // Remove leading slash

  await client.send(
    new DeleteObjectCommand({ Bucket: bucket, Key: key })
  );

  logger.info("File deleted from S3", { key });
};

/**
 * replaceInS3 — Deletes the old file and uploads the new one atomically.
 * Use when updating product images to avoid orphaned objects in S3.
 * @param {string} oldUrl - Public URL of the existing S3 file
 * @param {Express.Multer.File} newFile - New multer file to upload
 * @param {string} folder - S3 folder/prefix for the new file
 * @returns {Promise<string>} Public URL of the new uploaded file
 */
const replaceInS3 = async (oldUrl, newFile, folder = "uploads") => {
  if (oldUrl) {
    await deleteFromS3(oldUrl).catch((err) =>
      logger.warn("Failed to delete old S3 file during replace", { error: err.message })
    );
  }
  return uploadToS3(newFile, folder);
};

export { uploadToS3, deleteFromS3, replaceInS3, getPublicUrl };
export default uploadToS3;
