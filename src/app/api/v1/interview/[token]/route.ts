// ============================================================
// API: Public Interview Access (candidate-facing)
// GET /api/v1/interview/[token] — Get interview data for candidate
// POST /api/v1/interview/[token] — Start interview / update status
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { d1QueryFirst, d1Query, d1Run, parseJsonColumn, nowISO } from '@/lib/db/d1';

type RouteParams = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    // Find session by invite token
    const session = await d1QueryFirst<Record<string, unknown>>(
      `SELECT s.*, c.full_name as candidate_name, c.email as candidate_email,
              r.title as role_title, r.department as role_department,
              o.name as org_name, o.brand_color, o.settings as org_settings
       FROM interview_sessions s
       LEFT JOIN candidates c ON s.candidate_id = c.id
       LEFT JOIN job_roles r ON s.role_id = r.id
       LEFT JOIN organizations o ON s.org_id = o.id
       WHERE s.invite_token = ?`,
      [token],
    );

    if (!session) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    // Check if expired
    const expiresAt = new Date(session.invite_expires_at as string);
    if (expiresAt < new Date() && session.status === 'invited') {
      return NextResponse.json({ error: 'Interview link has expired' }, { status: 410 });
    }

    // Check if already completed
    if (['completed', 'evaluated', 'reviewed', 'archived'].includes(session.status as string)) {
      return NextResponse.json({ error: 'Interview has already been completed' }, { status: 410 });
    }

    // Get questions for this role
    const questions = await d1Query(
      `SELECT id, question_text, category, difficulty, time_limit_seconds, order_index
       FROM question_templates
       WHERE role_id = ? AND org_id = ? AND is_active = 1
       ORDER BY order_index ASC`,
      [session.role_id, session.org_id],
    );

    // Get existing answers (for resume)
    const existingAnswers = await d1Query(
      'SELECT question_index, transcript FROM answers WHERE session_id = ?',
      [session.id],
    );

    const orgSettings = parseJsonColumn(session.org_settings as string, {
      default_time_limit: 120,
      max_questions: 5,
      max_tab_switches: 3,
      enforce_fullscreen: false,
      tts_voice: 'en-US-GuyNeural',
    });

    return NextResponse.json({
      session: {
        id: session.id,
        status: session.status,
        tab_switch_count: session.tab_switch_count,
      },
      candidate: {
        name: session.candidate_name,
        email: session.candidate_email,
      },
      role: {
        title: session.role_title,
        department: session.role_department,
      },
      organization: {
        name: session.org_name,
        brand_color: session.brand_color,
      },
      settings: orgSettings,
      questions,
      completed_indices: existingAnswers.map((a: Record<string, unknown>) => a.question_index),
    });
  } catch (err) {
    console.error('[InterviewToken] GET error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { action, browser_info } = body;

    const session = await d1QueryFirst<Record<string, unknown>>(
      'SELECT id, org_id, status FROM interview_sessions WHERE invite_token = ?',
      [token],
    );

    if (!session) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    if (action === 'start') {
      if (session.status !== 'invited' && session.status !== 'in_progress') {
        return NextResponse.json({ error: 'Interview cannot be started' }, { status: 400 });
      }

      await d1Run(
        `UPDATE interview_sessions SET status = 'in_progress', started_at = ?, browser_info = ?
         WHERE id = ?`,
        [nowISO(), JSON.stringify(browser_info || {}), session.id],
      );

      return NextResponse.json({ success: true, status: 'in_progress' });
    }

    if (action === 'complete') {
      await d1Run(
        `UPDATE interview_sessions SET status = 'completed', completed_at = ?
         WHERE id = ?`,
        [nowISO(), session.id],
      );

      return NextResponse.json({ success: true, status: 'completed' });
    }

    if (action === 'tab_switch') {
      await d1Run(
        'UPDATE interview_sessions SET tab_switch_count = tab_switch_count + 1 WHERE id = ?',
        [session.id],
      );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('[InterviewToken] POST error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
