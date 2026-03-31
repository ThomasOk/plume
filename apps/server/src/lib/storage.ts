import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../env';

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.SERVER_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.SERVER_R2_ACCESS_KEY_ID,
    secretAccessKey: env.SERVER_R2_SECRET_ACCESS_KEY,
  },
});

// Presigned URL for direct client-to-R2 upload (PUT), expires in 5 minutes.
// ContentDisposition is signed so R2 stores it on the object and serves it on every request.
export async function generateUploadUrl(
  key: string,
  mimeType: string,
  filename: string,
): Promise<{ url: string; contentDisposition: string }> {
  const contentDisposition = `inline; filename*=UTF-8''${encodeURIComponent(filename)}`;
  const command = new PutObjectCommand({
    Bucket: env.SERVER_R2_BUCKET_NAME,
    Key: key,
    ContentType: mimeType,
    ContentDisposition: contentDisposition,
  });
  const url = await getSignedUrl(client, command, { expiresIn: 300 });
  return { url, contentDisposition };
}

// Public URL for accessing an uploaded file
export function getPublicUrl(key: string): string {
  return `${env.SERVER_R2_PUBLIC_URL}/${key}`;
}

export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: env.SERVER_R2_BUCKET_NAME,
    Key: key,
  });
  await client.send(command);
}
