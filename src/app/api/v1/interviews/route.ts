// ============================================================
// API: Interview Sessions — List, Create, Delete
// GET /api/v1/interviews — List sessions for org
// POST /api/v1/interviews — Create a new session (invite)
// DELETE /api/v1/interviews?id=<uuid> — Delete session
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/auth/server';
import { d1Query, d1QueryFirst, d1Run, generateId, nowISO, futureISO } from '@/lib/db/d1';
import { sendInterviewInvite } from '@/lib/email';
import { deleteFromR2 } from '@/lib/storage/r2';

export async function GET() {
  try {
    const auth = await authenticateAdmin();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sessions = await d1Query(
      `SELECT s.*, c.full_name as candidate_name, c.email as candidate_email,
              r.title as role_title, r.department as role_department
       FROM interview_sessions s
       LEFT JOIN candidates c ON s.candidate_id = c.id
       LEFT JOIN job_roles r ON s.role_id = r.id
       WHERE s.org_id = ?
       ORDER BY s.created_at DESC`,
      [auth.orgId],
    );

    // Reshape flat rows into the nested structure the frontend expects
    const shaped = sessions.map((s: Record<string, unknown>) => ({
      ...s,
      candidate: s.candidate_name ? { full_name: s.candidate_name, email: s.candidate_email } : null,
      job_role: s.role_title ? { title: s.role_title } : null,
    }));

    return NextResponse.json({ sessions: shaped, pagination: { total: shaped.length } });
  } catch (err) {
    console.error('[Interviews] GET error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAdmin();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { candidate_id, role_id, send_email, deadline } = body;

    if (!candidate_id || !role_id) {
      return NextResponse.json({ error: 'candidate_id and role_id are required' }, { status: 400 });
    }

    // Verify candidate belongs to this org
    const candidate = await d1QueryFirst<{ id: string; full_name: string; email: string }>(
      'SELECT id, full_name, email FROM candidates WHERE id = ? AND org_id = ?',
      [candidate_id, auth.orgId],
    );
    if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });

    // Verify role belongs to this org
    const role = await d1QueryFirst<{ id: string; title: string }>(
      'SELECT id, title FROM job_roles WHERE id = ? AND org_id = ? AND is_active = 1',
      [role_id, auth.orgId],
    );
    if (!role) return NextResponse.json({ error: 'Job role not found' }, { status: 404 });

    // Get org name
    const org = await d1QueryFirst<{ name: string }>(
      'SELECT name FROM organizations WHERE id = ?',
      [auth.orgId],
    );

    const id = generateId();
    const inviteToken = crypto.randomUUID().replace(/-/g, '');
    // Use admin-provided deadline or default to 7 days from now
    const expiresAt = deadline
      ? new Date(deadline + 'T23:59:59Z').toISOString()
      : futureISO(7);

    await d1Run(
      `INSERT INTO interview_sessions (id, org_id, candidate_id, role_id, invite_token, invite_expires_at, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, auth.orgId, candidate_id, role_id, inviteToken, expiresAt, auth.user.id, nowISO()],
    );

    const inviteUrl = `/interview/${inviteToken}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const fullInviteUrl = `${appUrl}${inviteUrl}`;

    // Send email invitation if requested
    let emailSent = false;
    if (send_email) {
      emailSent = await sendInterviewInvite({
        to: candidate.email,
        candidateName: candidate.full_name,
        roleName: role.title,
        companyName: org?.name || 'Our Company',
        interviewUrl: fullInviteUrl,
        expiresAt,
      });
    }

    return NextResponse.json({
      id,
      invite_token: inviteToken,
      invite_url: inviteUrl,
      full_invite_url: fullInviteUrl,
      email_sent: emailSent,
      candidate_name: candidate.full_name,
      candidate_email: candidate.email,
      role_title: role.title,
    }, { status: 201 });
  } catch (err) {
    console.error('[Interviews] POST error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateAdmin();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });

    // ── 1. Collect all R2 keys that need to be deleted ──────────
    // Get audio files from answers
    const answers = await d1Query<{ audio_url: string | null }>(
      'SELECT audio_url FROM answers WHERE session_id = ?',
      [id],
    );

    // Get the video recording from the session
    const session = await d1QueryFirst<{ video_url: string | null }>(
      'SELECT video_url FROM interview_sessions WHERE id = ? AND org_id = ?',
      [id, auth.orgId],
    );

    // ── 2. Delete files from Cloudflare R2 ──────────────────────
    const r2Keys: string[] = [];
    for (const a of answers) {
      if (a.audio_url) r2Keys.push(a.audio_url);
    }
    if (session?.video_url) r2Keys.push(session.video_url);

    // Delete R2 objects in parallel (best-effort — don't block on failures)
    if (r2Keys.length > 0) {
      const results = await Promise.allSettled(
        r2Keys.map((key) => deleteFromR2(key)),
      );
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        console.warn(`[Interviews] Failed to delete ${failed.length}/${r2Keys.length} R2 objects`);
      } else {
        console.log(`[Interviews] Deleted ${r2Keys.length} R2 objects for session ${id}`);
      }
    }

    // ── 3. Delete database records ──────────────────────────────
    // Delete evaluation queue entries for this session's answers
    await d1Run(
      `DELETE FROM evaluation_queue WHERE answer_id IN (
        SELECT id FROM answers WHERE session_id = ?
      )`,
      [id],
    );

    // Delete answers
    await d1Run(
      'DELETE FROM answers WHERE session_id = ?',
      [id],
    );

    // Delete the session itself
    await d1Run(
      'DELETE FROM interview_sessions WHERE id = ? AND org_id = ?',
      [id, auth.orgId],
    );

    return NextResponse.json({ success: true, r2_deleted: r2Keys.length });
  } catch (err) {
    console.error('[Interviews] DELETE error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
