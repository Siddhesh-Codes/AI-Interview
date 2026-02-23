// ============================================================
// API: Media Proxy — Serve R2 content through Vercel
// GET /api/v1/media?key=<r2-key>
// Solves CORS issues with direct R2 signed URLs
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/auth/server';
import { getR2SignedUrl } from '@/lib/storage/r2';

export async function GET(request: NextRequest) {
  try {
    // Authenticate — cookies are sent automatically for same-origin requests
    const auth = await authenticateAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const key = request.nextUrl.searchParams.get('key');
    if (!key) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
    }

    // Verify the key belongs to this admin's organization
    // Key format: audio/{orgId}/... or video/{orgId}/...
    const keyParts = key.split('/');
    if (keyParts.length < 3) {
      return NextResponse.json({ error: 'Invalid key format' }, { status: 400 });
    }
    const keyOrgId = keyParts[1];
    if (keyOrgId !== auth.orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Generate a signed URL and fetch the content server-side
    // This avoids CORS issues since the fetch happens on our server
    const signedUrl = await getR2SignedUrl(key, 300);
    const r2Res = await fetch(signedUrl, {
      headers: request.headers.get('range')
        ? { Range: request.headers.get('range')! }
        : {},
    });

    if (!r2Res.ok && r2Res.status !== 206) {
      console.error('[Media] R2 fetch failed:', r2Res.status, r2Res.statusText);
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    // Pass through the response with appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', r2Res.headers.get('content-type') || 'application/octet-stream');
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'private, max-age=3600');

    const contentLength = r2Res.headers.get('content-length');
    if (contentLength) headers.set('Content-Length', contentLength);

    const contentRange = r2Res.headers.get('content-range');
    if (contentRange) headers.set('Content-Range', contentRange);

    return new Response(r2Res.body, {
      status: r2Res.status,
      headers,
    });
  } catch (err: any) {
    console.error('[Media] Proxy error:', err);
    return NextResponse.json({ error: 'Failed to load media' }, { status: 500 });
  }
}
