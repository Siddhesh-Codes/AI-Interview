// ============================================================
// API: Generate Presigned Upload URL
// POST /api/v1/upload-url — Returns a presigned PUT URL for R2
// Used for direct browser → R2 uploads (bypasses Vercel 4.5MB limit)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { d1QueryFirst } from '@/lib/db/d1';
import { getR2PresignedUploadUrl } from '@/lib/storage/r2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, type } = body;

    if (!session_id || !type) {
      return NextResponse.json({ error: 'Missing session_id or type' }, { status: 400 });
    }

    if (type !== 'video') {
      return NextResponse.json({ error: 'Unsupported upload type' }, { status: 400 });
    }

    // Verify session exists and is valid
    const session = await d1QueryFirst<Record<string, unknown>>(
      'SELECT id, org_id FROM interview_sessions WHERE id = ?',
      [session_id],
    );

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Generate the R2 key and presigned URL
    const videoKey = `video/${session.org_id}/${session_id}/recording_${Date.now()}.webm`;
    const uploadUrl = await getR2PresignedUploadUrl(videoKey, 'video/webm', 600);

    return NextResponse.json({
      upload_url: uploadUrl,
      key: videoKey,
    });
  } catch (err) {
    console.error('[UploadUrl] Error:', err);
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}
