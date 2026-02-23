// ============================================================
// API: Upload Interview Video Recording
// POST /api/v1/interview-video — Upload full interview video
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { d1QueryFirst, d1Run, nowISO } from '@/lib/db/d1';
import { uploadToR2 } from '@/lib/storage/r2';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const sessionId = formData.get('session_id') as string;
    const videoFile = formData.get('video') as Blob | null;

    if (!sessionId || !videoFile) {
      return NextResponse.json({ error: 'Missing session_id or video' }, { status: 400 });
    }

    // Verify session exists
    const session = await d1QueryFirst<Record<string, unknown>>(
      'SELECT id, org_id FROM interview_sessions WHERE id = ?',
      [sessionId],
    );

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Upload video to R2 with low-quality path
    const buffer = Buffer.from(await videoFile.arrayBuffer());
    const videoKey = `video/${session.org_id}/${sessionId}/recording_${Date.now()}.webm`;

    await uploadToR2(videoKey, buffer, 'video/webm');

    // Store the video key and expiry date in the session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 15);

    await d1Run(
      `UPDATE interview_sessions
       SET video_url = ?, video_expires_at = ?
       WHERE id = ?`,
      [videoKey, expiresAt.toISOString(), sessionId],
    );

    console.log(`[Video] Uploaded ${(buffer.length / 1024 / 1024).toFixed(1)}MB for session ${sessionId}`);

    return NextResponse.json({
      success: true,
      size_mb: (buffer.length / 1024 / 1024).toFixed(1),
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('[Video] Upload error:', err);
    return NextResponse.json({ error: 'Video upload failed' }, { status: 500 });
  }
}
