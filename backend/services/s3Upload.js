import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client } from "../config/s3.js";
import logger from "../utils/logger.js";
import fs from "fs/promises";

const getPublicUrl = (key) => {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION;
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

const uploadToS3 = async (file, folder = "products") => {
  const client = getS3Client();
  const bucket = process.env.AWS_S3_BUCKET;

  if (!client || !bucket) {
    throw new Error("S3 is not configured. Check AWS environment variables.");
  }

  const key = `${folder}/${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
  const fileBuffer = file.buffer || (await fs.readFile(file.path));

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: file.mimetype,
    })
  );

  if (file.path) {
    await fs.unlink(file.path).catch(() => {});
  }

  const url = getPublicUrl(key);
  logger.info("File uploaded to S3", { key });
  return url;
};

export default uploadToS3;
