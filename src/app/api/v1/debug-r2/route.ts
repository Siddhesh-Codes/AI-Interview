// Temporary diagnostic endpoint — DELETE after debugging
// GET /api/v1/debug-r2?key=<r2-key>

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/auth/server';
import { getR2Object } from '@/lib/storage/r2';
import { d1Query } from '@/lib/db/d1';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // List all sessions with video URLs for this org
    const sessions = await d1Query(
      `SELECT id, video_url, video_expires_at, status, created_at
       FROM interview_sessions
       WHERE org_id = ? AND video_url IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 5`,
      [auth.orgId],
    );

    // Also list sessions with answers that have audio
    const answers = await d1Query(
      `SELECT a.id, a.session_id, a.audio_url, a.question_index
       FROM answers a
       JOIN interview_sessions s ON a.session_id = s.id
       WHERE s.org_id = ? AND a.audio_url IS NOT NULL
       ORDER BY a.submitted_at DESC
       LIMIT 5`,
      [auth.orgId],
    );

    // If a specific key is provided, try to generate a signed URL and fetch it
    const testKey = request.nextUrl.searchParams.get('key');
    let testResult: any = null;

    if (testKey) {
      try {
        const r2Res = await getR2Object(testKey);
        const bodyBytes = await r2Res.Body?.transformToByteArray();
        testResult = {
          key: testKey,
          status: 'ok',
          contentType: r2Res.ContentType,
          contentLength: r2Res.ContentLength,
          bodySize: bodyBytes?.length || 0,
        };
      } catch (err: any) {
        testResult = {
          key: testKey,
          error: err.message,
          name: err.name,
          httpStatus: err.$metadata?.httpStatusCode,
        };
      }
    }

    return NextResponse.json({
      orgId: auth.orgId,
      sessions: sessions.map((s: any) => ({
        id: s.id,
        video_url: s.video_url,
        video_expires_at: s.video_expires_at,
        status: s.status,
      })),
      answers: answers.map((a: any) => ({
        id: a.id,
        session_id: a.session_id,
        audio_url: a.audio_url,
        question_index: a.question_index,
      })),
      testResult,
      env: {
        hasR2AccountId: !!process.env.R2_ACCOUNT_ID,
        hasR2AccessKey: !!process.env.R2_ACCESS_KEY_ID,
        hasR2SecretKey: !!process.env.R2_SECRET_ACCESS_KEY,
        r2Bucket: process.env.R2_BUCKET_NAME || 'hr-interviews',
        r2Endpoint: (process.env.R2_ENDPOINT || '').substring(0, 40) + '...',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack?.substring(0, 500) }, { status: 500 });
  }
}
