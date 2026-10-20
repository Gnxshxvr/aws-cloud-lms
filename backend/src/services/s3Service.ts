import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import { getS3Client } from '../config/aws.js';
import { config } from '../config/env.js';
import { logger } from './loggerService.js';

const LOCAL_UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
  fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
}

export interface UploadResult {
  key: string;
  url: string;
  storageType: 's3' | 'local';
}

export class S3Service {
  /**
   * Uploads a file buffer or stream to Amazon S3, or local storage fallback.
   */
  static async uploadFile(
    fileBuffer: Buffer,
    key: string,
    mimeType: string
  ): Promise<UploadResult> {
    if (config.aws.useLocalStorage) {
      const localFilePath = path.join(LOCAL_UPLOADS_DIR, key.replace(/\//g, '_'));
      const dir = path.dirname(localFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(localFilePath, fileBuffer);
      const filename = path.basename(localFilePath);
      const url = `/uploads/${filename}`;
      await logger.info(`File saved locally: ${key} -> ${url}`);
      return { key, url, storageType: 'local' };
    }

    try {
      const client = getS3Client();
      const command = new PutObjectCommand({
        Bucket: config.aws.s3Bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
      });

      await client.send(command);
      const url = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
      await logger.info(`File uploaded to Amazon S3: ${key}`);
      return { key, url, storageType: 's3' };
    } catch (err: any) {
      await logger.error(`S3 upload failed for ${key}, falling back to local: ${err.message}`);
      // Graceful fallback to local
      const localFilePath = path.join(LOCAL_UPLOADS_DIR, key.replace(/\//g, '_'));
      fs.writeFileSync(localFilePath, fileBuffer);
      const filename = path.basename(localFilePath);
      return { key, url: `/uploads/${filename}`, storageType: 'local' };
    }
  }

  /**
   * Generates a secure presigned download URL with time-limited validity (1 hour).
   */
  static async getDownloadUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
    if (config.aws.useLocalStorage) {
      const filename = key.replace(/\//g, '_');
      return `/uploads/${filename}`;
    }

    try {
      const client = getS3Client();
      const command = new GetObjectCommand({
        Bucket: config.aws.s3Bucket,
        Key: key,
      });
      const presignedUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
      return presignedUrl;
    } catch (err: any) {
      await logger.warn(`Failed to generate S3 presigned URL for ${key}: ${err.message}`);
      const filename = key.replace(/\//g, '_');
      return `/uploads/${filename}`;
    }
  }

  /**
   * Generates a presigned upload URL for direct browser-to-S3 upload.
   */
  static async getPresignedUploadUrl(
    key: string,
    mimeType: string,
    expiresInSeconds: number = 900
  ): Promise<{ uploadUrl: string; key: string }> {
    if (config.aws.useLocalStorage) {
      return {
        uploadUrl: `/api/submissions/upload-direct?key=${encodeURIComponent(key)}`,
        key,
      };
    }

    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: key,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
    return { uploadUrl, key };
  }

  /**
   * Deletes an object from S3 or local storage.
   */
  static async deleteFile(key: string): Promise<void> {
    if (config.aws.useLocalStorage) {
      const localFilePath = path.join(LOCAL_UPLOADS_DIR, key.replace(/\//g, '_'));
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
      return;
    }

    try {
      const client = getS3Client();
      await client.send(
        new DeleteObjectCommand({
          Bucket: config.aws.s3Bucket,
          Key: key,
        })
      );
      await logger.info(`Deleted file from S3: ${key}`);
    } catch (err: any) {
      await logger.error(`Failed to delete S3 file ${key}: ${err.message}`);
    }
  }
}
