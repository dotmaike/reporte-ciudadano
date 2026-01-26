import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Server-side only B2 client configuration
 * These credentials are never exposed to the browser
 */
const b2Client = new S3Client({
  endpoint: process.env.B2_ENDPOINT,
  region: process.env.B2_REGION,
  credentials: {
    accessKeyId: process.env.B2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.B2_SECRET_ACCESS_KEY ?? '',
  },
});

const BUCKET_NAME = process.env.B2_BUCKET_NAME ?? '';

/**
 * Upload a file to B2 storage
 * @param key - The file key/path in the bucket
 * @param body - The file content as Buffer
 * @param contentType - The MIME type of the file
 * @returns The key of the uploaded file
 */
export async function uploadToB2(key: string, body: Buffer, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await b2Client.send(command);
  return key;
}

/**
 * Generate a presigned URL for viewing a file
 * @param key - The file key/path in the bucket
 * @param expiresIn - URL expiration time in seconds (default: 7 days)
 * @returns The presigned URL
 */
export async function getPresignedUrl(key: string, expiresIn = 604800): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(b2Client, command, { expiresIn });
}

/**
 * Generate the storage key for a report image
 * @param reportId - The report ID
 * @param filename - Original filename
 * @returns The storage key
 */
export function generateImageKey(reportId: string, filename: string): string {
  const extension = filename.split('.').pop() ?? 'webp';
  const timestamp = Date.now();
  return `reports/${reportId}/${timestamp}.${extension}`;
}
