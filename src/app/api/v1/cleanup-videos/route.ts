// ============================================================
// API: Cleanup Expired Videos
// GET/POST /api/v1/cleanup-videos — Delete videos older than 15 days
// Protected by CRON_SECRET. Called automatically by Vercel Cron.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { d1Query, d1Run, nowISO } from '@/lib/db/d1';
import { deleteFromR2 } from '@/lib/storage/r2';

async function handleCleanup(request: NextRequest) {
  try {
    // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find all sessions with expired videos
    const expiredSessions = await d1Query<{ id: string; video_url: string }>(
      `SELECT id, video_url FROM interview_sessions
       WHERE video_url IS NOT NULL
         AND video_expires_at IS NOT NULL
         AND video_expires_at < ?`,
      [nowISO()],
    );

    if (expiredSessions.length === 0) {
      return NextResponse.json({ success: true, deleted: 0, message: 'No expired videos found' });
    }

    let deletedCount = 0;
    const errors: string[] = [];

    for (const session of expiredSessions) {
      try {
        // Delete from R2
        await deleteFromR2(session.video_url);

        // Clear video fields in DB
        await d1Run(
          `UPDATE interview_sessions
           SET video_url = NULL, video_expires_at = NULL
           WHERE id = ?`,
          [session.id],
        );

        deletedCount++;
      } catch (err) {
        const msg = `Failed to delete video for session ${session.id}: ${err}`;
        console.error('[Cleanup]', msg);
        errors.push(msg);
      }
    }

    console.log(`[Cleanup] Deleted ${deletedCount}/${expiredSessions.length} expired videos`);

    return NextResponse.json({
      success: true,
      total: expiredSessions.length,
      deleted: deletedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('[Cleanup] Error:', err);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}

// Vercel Cron uses GET
export { handleCleanup as GET, handleCleanup as POST };
