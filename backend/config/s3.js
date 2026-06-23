import { S3Client } from "@aws-sdk/client-s3";
import logger from "../utils/logger.js";

let s3Client = null;

const initS3 = () => {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    logger.warn("AWS S3 credentials not fully configured");
    return null;
  }

  s3Client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  logger.info("AWS S3 client initialized", { region });
  return s3Client;
};

const getS3Client = () => s3Client;

export { initS3, getS3Client };
