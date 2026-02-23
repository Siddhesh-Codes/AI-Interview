// ============================================================
// API: Media Proxy — Stream R2 content through Vercel
// GET /api/v1/media?key=<r2-key>
// Solves CORS issues with direct R2 signed URLs
// Supports Range requests for video seeking
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/auth/server';
import { getR2Object } from '@/lib/storage/r2';

export async function GET(request: NextRequest) {
  try {
    // Authenticate — cookies are sent automatically for same-origin requests
    // (including <video src="...">, new Audio(...), etc.)
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

    // Fetch from R2, passing through Range header if present
    const rangeHeader = request.headers.get('range');
    const r2Response = await getR2Object(key, rangeHeader);

    // Build response headers
    const headers = new Headers();
    headers.set('Content-Type', r2Response.ContentType || 'application/octet-stream');
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'private, max-age=3600');

    if (r2Response.ContentLength !== undefined) {
      headers.set('Content-Length', r2Response.ContentLength.toString());
    }
    if (r2Response.ContentRange) {
      headers.set('Content-Range', r2Response.ContentRange);
    }

    // Stream the response body
    const body = r2Response.Body;
    let responseStream: ReadableStream | null = null;

    if (body) {
      if (typeof (body as any).transformToWebStream === 'function') {
        // Modern AWS SDK: use built-in web stream conversion
        responseStream = (body as any).transformToWebStream();
      } else if (typeof (body as any).pipe === 'function') {
        // Node.js Readable stream fallback
        const { Readable } = await import('stream');
        responseStream = Readable.toWeb(body as any) as ReadableStream;
      } else {
        // Last resort: buffer the entire body
        const bytes = await (body as any).transformToByteArray();
        responseStream = new ReadableStream({
          start(controller) {
            controller.enqueue(bytes);
            controller.close();
          },
        });
      }
    }

    return new Response(responseStream, {
      status: r2Response.ContentRange ? 206 : 200,
      headers,
    });
  } catch (err: any) {
    console.error('[Media] Proxy error:', err);

    if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to load media' }, { status: 500 });
  }
}
