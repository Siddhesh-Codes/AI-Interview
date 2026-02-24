// ============================================================
// API: Upload Interview Video Recording
// POST /api/v1/interview-video — Upload or register video recording
// Supports two modes:
//   1. FormData with video file (legacy, limited to Vercel body size)
//   2. JSON with { session_id, video_key } (after direct R2 upload)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { d1QueryFirst, d1Run, nowISO } from '@/lib/db/d1';
import { uploadToR2 } from '@/lib/storage/r2';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 video uploads per minute per IP
    const ip = getClientIp(request);
    if (ip) {
      const rl = rateLimit('video-upload', ip, 10, 60_000);
      if (rl.limited) return rateLimitResponse(rl.retryAfterMs);
    }

    const contentType = request.headers.get('content-type') || '';

    // Mode 2: Direct R2 upload confirmation (JSON body)
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { session_id, video_key, size_mb } = body;

      if (!session_id || !video_key) {
        return NextResponse.json({ error: 'Missing session_id or video_key' }, { status: 400 });
      }

      // Verify session exists and is in progress
      const session = await d1QueryFirst<Record<string, unknown>>(
        "SELECT id, org_id FROM interview_sessions WHERE id = ? AND status IN ('in_progress', 'completed')",
        [session_id],
      );
      if (!session) {
        return NextResponse.json({ error: 'Invalid or inactive session' }, { status: 400 });
      }

      // Store the video key and expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 15);

      await d1Run(
        `UPDATE interview_sessions
         SET video_url = ?, video_expires_at = ?
         WHERE id = ?`,
        [video_key, expiresAt.toISOString(), session_id],
      );

      console.log(`[Video] Registered direct-upload ${size_mb || '?'}MB for session ${session_id}`);

      return NextResponse.json({
        success: true,
        size_mb: size_mb || '0',
        expires_at: expiresAt.toISOString(),
      });
    }

    // Mode 1: FormData upload (legacy fallback for small videos)
    const formData = await request.formData();
    const sessionId = formData.get('session_id') as string;
    const videoFile = formData.get('video') as Blob | null;

    if (!sessionId || !videoFile) {
      return NextResponse.json({ error: 'Missing session_id or video' }, { status: 400 });
    }

    // Verify session exists and is in progress
    const session = await d1QueryFirst<Record<string, unknown>>(
      "SELECT id, org_id FROM interview_sessions WHERE id = ? AND status IN ('in_progress', 'completed')",
      [sessionId],
    );

    if (!session) {
      return NextResponse.json({ error: 'Invalid or inactive session' }, { status: 400 });
    }

    // Upload video to R2
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
