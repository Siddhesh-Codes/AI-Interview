// ============================================================
// API: Media Proxy — Serve R2 content through Vercel
// GET /api/v1/media?key=<r2-key>
// Uses S3 client directly to fetch from R2 and serve to browser
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/auth/server';
import { getR2Object } from '@/lib/storage/r2';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const key = request.nextUrl.searchParams.get('key');
    if (!key) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
    }

    // Verify the key belongs to this admin's organization
    const keyParts = key.split('/');
    if (keyParts.length < 3) {
      return NextResponse.json({ error: 'Invalid key format' }, { status: 400 });
    }
    const keyOrgId = keyParts[1];
    if (keyOrgId !== auth.orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch directly from R2 using S3 client
    let r2Response;
    try {
      r2Response = await getR2Object(key);
    } catch (s3Err: any) {
      console.error('[Media] S3 GetObject failed:', s3Err?.name, s3Err?.message, s3Err?.$metadata?.httpStatusCode);
      const status = s3Err?.$metadata?.httpStatusCode || 500;
      return NextResponse.json({
        error: status === 404 ? 'Media not found in R2' : 'R2 access error',
        detail: s3Err?.name + ': ' + s3Err?.message,
      }, { status: status === 404 ? 404 : 500 });
    }

    // Read body — try multiple methods for compatibility
    let buffer: Buffer;
    try {
      const stream = r2Response.Body;
      if (!stream) {
        return NextResponse.json({ error: 'Empty R2 response body' }, { status: 404 });
      }

      if (typeof (stream as any).transformToByteArray === 'function') {
        const bytes = await (stream as any).transformToByteArray();
        buffer = Buffer.from(bytes);
      } else if (typeof (stream as any).arrayBuffer === 'function') {
        const ab = await (stream as any).arrayBuffer();
        buffer = Buffer.from(ab);
      } else {
        // Collect chunks manually from async iterable
        const chunks: Uint8Array[] = [];
        for await (const chunk of stream as any) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        buffer = Buffer.concat(chunks);
      }
    } catch (bodyErr: any) {
      console.error('[Media] Body read failed:', bodyErr?.message);
      return NextResponse.json({
        error: 'Failed to read R2 object body',
        detail: bodyErr?.message,
      }, { status: 500 });
    }

    if (buffer.length === 0) {
      return NextResponse.json({ error: 'Empty media file' }, { status: 404 });
    }

    // Determine content type
    const contentType = r2Response.ContentType
      || (key.endsWith('.webm') ? 'video/webm'
        : key.endsWith('.mp3') || key.endsWith('.mpeg') ? 'audio/mpeg'
        : 'application/octet-stream');

    return new Response(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Accept-Ranges': 'none',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err: any) {
    console.error('[Media] Proxy error:', err?.name, err?.message, err?.stack?.substring(0, 300));
    return NextResponse.json({
      error: 'Media proxy failed',
      detail: err?.message,
    }, { status: 500 });
  }
}
