import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const IMAGE_EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

let b2Client: S3Client | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required B2 environment variable: ${name}`);
  }

  return value;
}

function getB2Client(): S3Client {
  if (!b2Client) {
    b2Client = new S3Client({
      endpoint: getRequiredEnv('B2_ENDPOINT'),
      region: getRequiredEnv('B2_REGION'),
      credentials: {
        accessKeyId: getRequiredEnv('B2_ACCESS_KEY_ID'),
        secretAccessKey: getRequiredEnv('B2_SECRET_ACCESS_KEY'),
      },
    });
  }

  return b2Client;
}

function getBucketName(): string {
  return getRequiredEnv('B2_BUCKET_NAME');
}

/**
 * Upload a file to B2 storage
 * @param key - The file key/path in the bucket
 * @param body - The file content as Buffer
 * @param contentType - The MIME type of the file
 * @returns The key of the uploaded file
 */
export async function uploadToB2(key: string, body: Buffer, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await getB2Client().send(command);
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
    Bucket: getBucketName(),
    Key: key,
  });

  return getSignedUrl(getB2Client(), command, { expiresIn });
}

/**
 * Generate the storage key for a report image
 * @param reportId - The report ID
 * @param contentType - MIME type used to derive a trusted extension
 * @returns The storage key
 */
export function generateImageKey(reportId: string, contentType: string): string {
  const extension = IMAGE_EXTENSION_BY_TYPE[contentType] ?? 'webp';
  const timestamp = Date.now();
  return `reports/${reportId}/${timestamp}.${extension}`;
}
