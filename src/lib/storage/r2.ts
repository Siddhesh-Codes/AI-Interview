// ============================================================
// Cloudflare R2 Storage Client (S3-compatible)
// Upload, download, and generate signed URLs for audio files
// ============================================================

import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = (process.env.R2_ACCOUNT_ID || '').trim();
const R2_ACCESS_KEY_ID = (process.env.R2_ACCESS_KEY_ID || '').trim();
const R2_SECRET_ACCESS_KEY = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
const R2_BUCKET_NAME = (process.env.R2_BUCKET_NAME || 'hr-interviews').trim();
const R2_ENDPOINT = (process.env.R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`).trim();

let _client: S3Client | null = null;

function getClient(): S3Client {
    if (!_client) {
        _client = new S3Client({
            region: 'auto',
            endpoint: R2_ENDPOINT,
            forcePathStyle: true, // Required for Cloudflare R2
            credentials: {
                accessKeyId: R2_ACCESS_KEY_ID,
                secretAccessKey: R2_SECRET_ACCESS_KEY,
            },
        });
    }
    return _client;
}

/**
 * Upload a file to R2
 * @returns The object key (path) in R2
 */
export async function uploadToR2(
    key: string,
    body: Buffer | Uint8Array | ReadableStream | Blob,
    contentType: string = 'audio/webm',
): Promise<string> {
    const client = getClient();

    await client.send(
        new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: body as Buffer,
            ContentType: contentType,
        }),
    );

    return key;
}

/**
 * Generate a signed URL for reading a file from R2
 * @param key - The object key in R2
 * @param expiresIn - URL validity in seconds (default: 1 hour)
 */
export async function getR2SignedUrl(
    key: string,
    expiresIn: number = 3600,
): Promise<string> {
    const client = getClient();

    const url = await getSignedUrl(
        client,
        new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
        }),
        { expiresIn },
    );

    return url;
}

/**
 * Delete a file from R2
 */
export async function deleteFromR2(key: string): Promise<void> {
    const client = getClient();

    await client.send(
        new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
        }),
    );
}

/**
 * Generate a presigned PUT URL for direct browser → R2 upload
 * @param key - The object key in R2
 * @param contentType - MIME type of the file
 * @param expiresIn - URL validity in seconds (default: 10 minutes)
 */
export async function getR2PresignedUploadUrl(
    key: string,
    contentType: string = 'video/webm',
    expiresIn: number = 600,
): Promise<string> {
    const client = getClient();

    const url = await getSignedUrl(
        client,
        new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            ContentType: contentType,
        }),
        { expiresIn },
    );

    return url;
}

/**
 * Fetch an R2 object and return the raw response.
 * Used by the media proxy to stream content to the client.
 */
export async function getR2Object(
    key: string,
    rangeHeader?: string | null,
) {
    const client = getClient();
    const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        ...(rangeHeader ? { Range: rangeHeader } : {}),
    });
    return client.send(command);
}

/**
 * Generate a unique key for audio files
 * Format: audio/{orgId}/{sessionId}/{questionIndex}_{timestamp}.webm
 */
export function generateAudioKey(
    orgId: string,
    sessionId: string,
    questionIndex: number,
): string {
    const timestamp = Date.now();
    return `audio/${orgId}/${sessionId}/${questionIndex}_${timestamp}.webm`;
}
