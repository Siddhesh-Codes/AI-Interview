// ============================================================
// API: Media Proxy — Serve R2 content through Vercel
// GET /api/v1/media?key=<r2-key>
// Uses S3 client directly (not signed URLs) to avoid auth issues
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

    // Fetch directly from R2 using S3 client (no signed URL needed)
    const r2Response = await getR2Object(key);

    // Buffer the body (avoids stream compatibility issues on Vercel)
    const bodyBytes = await r2Response.Body?.transformToByteArray();
    if (!bodyBytes || bodyBytes.length === 0) {
      return NextResponse.json({ error: 'Empty media file' }, { status: 404 });
    }

    // Determine content type from key extension
    const contentType = r2Response.ContentType
      || (key.endsWith('.webm') ? 'video/webm' : 'application/octet-stream');

    const buffer = Buffer.from(bodyBytes);

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Accept-Ranges': 'none',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err: any) {
    console.error('[Media] Proxy error:', err?.name, err?.message);

    if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    return NextResponse.json({
      error: 'Failed to load media',
      detail: err?.message,
    }, { status: 500 });
  }
}
