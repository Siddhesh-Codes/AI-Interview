// ============================================================
// API: Media Proxy — Serve R2 content through Vercel
// GET /api/v1/media?key=<r2-key>
// Uses S3 client directly to fetch from R2 and serve to browser
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

// Inline S3 client to avoid any module-level init issues
function getR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: (process.env.R2_ENDPOINT || `https://${(process.env.R2_ACCOUNT_ID || '').trim()}.r2.cloudflarestorage.com`).trim(),
    forcePathStyle: true,
    credentials: {
      accessKeyId: (process.env.R2_ACCESS_KEY_ID || '').trim(),
      secretAccessKey: (process.env.R2_SECRET_ACCESS_KEY || '').trim(),
    },
  });
}

export async function GET(request: NextRequest) {
  const steps: string[] = [];

  try {
    // Step 1: Auth check
    steps.push('auth-start');
    // Dynamic import to avoid module-level issues
    const { authenticateAdmin } = await import('@/lib/auth/server');
    const auth = await authenticateAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized', steps }, { status: 401 });
    }
    steps.push('auth-ok: ' + auth.orgId);

    // Step 2: Validate key
    const key = request.nextUrl.searchParams.get('key');
    if (!key) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
    }
    steps.push('key: ' + key.substring(0, 50));

    // Verify the key belongs to this admin's organization
    const keyParts = key.split('/');
    if (keyParts.length < 3) {
      return NextResponse.json({ error: 'Invalid key format', steps }, { status: 400 });
    }
    const keyOrgId = keyParts[1];
    if (keyOrgId !== auth.orgId) {
      return NextResponse.json({ error: 'Forbidden', steps }, { status: 403 });
    }

    // Step 3: Fetch from R2
    steps.push('r2-fetch-start');
    const client = getR2Client();
    const result = await client.send(new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'hr-interviews',
      Key: key,
    }));
    steps.push('r2-fetch-ok: type=' + result.ContentType + ' len=' + result.ContentLength);

    // Step 4: Read body as Uint8Array (NOT Buffer — Buffer can cause issues with Response)
    steps.push('body-read-start');
    const body = result.Body;
    if (!body) {
      return NextResponse.json({ error: 'Empty R2 body', steps }, { status: 404 });
    }

    let bytes: Uint8Array;
    if (typeof (body as any).transformToByteArray === 'function') {
      bytes = await (body as any).transformToByteArray();
      steps.push('body-read-ok-transform: ' + bytes.length);
    } else {
      // Fallback: collect chunks
      const chunks: Uint8Array[] = [];
      for await (const chunk of body as any) {
        chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
      }
      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      bytes = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      steps.push('body-read-ok-chunks: ' + bytes.length);
    }

    if (bytes.length === 0) {
      return NextResponse.json({ error: 'Empty media file', steps }, { status: 404 });
    }

    // Step 5: Build response with Uint8Array (valid BodyInit)
    const contentType = result.ContentType
      || (key.endsWith('.webm') ? 'video/webm'
        : key.endsWith('.mp3') || key.endsWith('.mpeg') ? 'audio/mpeg'
        : 'application/octet-stream');

    steps.push('response-build: ' + contentType + ' ' + bytes.length + 'B');

    // Uint8Array is valid BodyInit at runtime; cast needed for TS strictness
    return new Response(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': bytes.length.toString(),
        'Accept-Ranges': 'none',
        'Cache-Control': 'private, max-age=3600',
        'X-Debug-Steps': steps.join(' | '),
      },
    });
  } catch (err: any) {
    steps.push('FATAL: ' + err?.name + ': ' + err?.message);
    console.error('[Media] Proxy error:', steps.join(' -> '), err?.stack?.substring(0, 500));
    return NextResponse.json({
      error: 'Media proxy failed',
      detail: err?.message,
      name: err?.name,
      steps,
      stack: err?.stack?.substring(0, 300),
    }, { status: 500 });
  }
}
