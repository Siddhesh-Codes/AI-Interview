// ============================================================
// API: Single Interview Session
// GET /api/v1/interviews/[id] — Get session with full details
// PATCH /api/v1/interviews/[id] — Update session (review)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/auth/server';
import { d1QueryFirst, d1Query, d1Run, parseJsonColumn } from '@/lib/db/d1';
import { reviewSessionSchema } from '@/types/schemas';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateAdmin();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    // Get session with candidate and role info
    const session = await d1QueryFirst(
      `SELECT s.*, c.full_name as candidate_name, c.email as candidate_email,
              c.phone as candidate_phone, r.title as role_title, r.department as role_department,
              r.description as role_description
       FROM interview_sessions s
       LEFT JOIN candidates c ON s.candidate_id = c.id
       LEFT JOIN job_roles r ON s.role_id = r.id
       WHERE s.id = ? AND s.org_id = ?`,
      [id, auth.orgId],
    );

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get answers with questions
    const answers = await d1Query(
      `SELECT a.*, qt.question_text, qt.category, qt.difficulty
       FROM answers a
       LEFT JOIN question_templates qt ON a.question_id = qt.id
       WHERE a.session_id = ?
       ORDER BY a.question_index ASC`,
      [id],
    );

    // Generate proxy URLs for audio and parse JSON columns
    const enrichedAnswers = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      answers.map(async (answer: any) => {
        let audioUrl = answer.audio_url;
        if (audioUrl && !audioUrl.startsWith('http')) {
          // It's an R2 key — use the media proxy route instead of a direct signed URL
          // The proxy handles CORS, auth, and streaming
          audioUrl = `/api/v1/media?key=${encodeURIComponent(audioUrl)}`;
        }
        return {
          id: answer.id,
          question_index: answer.question_index,
          audio_url: audioUrl,
          audio_duration_seconds: answer.audio_duration_seconds,
          transcript: answer.transcript,
          ai_evaluation: parseJsonColumn(answer.ai_evaluation, null),
          scores: parseJsonColumn(answer.scores, null),
          average_score: answer.average_score,
          strengths: parseJsonColumn(answer.strengths, []),
          risks: parseJsonColumn(answer.risks, []),
          ai_recommendation: answer.ai_recommendation,
          question: answer.question_text
            ? {
                id: answer.question_id,
                question_text: answer.question_text,
                category: answer.category,
                difficulty: answer.difficulty,
                time_limit_seconds: answer.time_limit_seconds,
                order_index: answer.question_index,
              }
            : null,
        };
      }),
    );

    // Build structured response matching what the review page expects
    const sessionData = session as Record<string, unknown>;

    // Generate proxy URL for video recording if it exists
    let videoUrl: string | null = null;
    if (sessionData.video_url && typeof sessionData.video_url === 'string') {
      // Use the media proxy route instead of a direct signed URL
      videoUrl = `/api/v1/media?key=${encodeURIComponent(sessionData.video_url as string)}`;
    }

    return NextResponse.json({
      session: {
        id: sessionData.id,
        status: sessionData.status,
        total_score: sessionData.total_score ?? null,
        ai_recommendation: sessionData.ai_recommendation ?? null,
        ai_summary: sessionData.ai_summary ?? null,
        tab_switch_count: sessionData.tab_switch_count ?? 0,
        created_at: sessionData.created_at,
        started_at: sessionData.started_at ?? null,
        completed_at: sessionData.completed_at ?? null,
        reviewer_notes: sessionData.reviewer_notes ?? null,
        reviewer_decision: sessionData.reviewer_decision ?? null,
        browser_info: parseJsonColumn(sessionData.browser_info as string, {}),
        video_url: videoUrl,
        video_expires_at: sessionData.video_expires_at ?? null,
        candidate: {
          full_name: sessionData.candidate_name ?? 'Unknown',
          email: sessionData.candidate_email ?? '',
          phone: sessionData.candidate_phone ?? '',
        },
        job_role: {
          title: sessionData.role_title ?? '',
          department: sessionData.role_department ?? '',
          description: sessionData.role_description ?? '',
        },
        answers: enrichedAnswers,
      },
    });
  } catch (err) {
    console.error('[Interview] GET error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateAdmin();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const parsed = reviewSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { reviewer_notes, reviewer_decision } = parsed.data;

    await d1Run(
      `UPDATE interview_sessions
       SET reviewer_notes = ?, reviewer_decision = ?, reviewer_id = ?,
           reviewed_at = datetime('now'), status = 'reviewed'
       WHERE id = ? AND org_id = ?`,
      [reviewer_notes || null, reviewer_decision, auth.user.id, id, auth.orgId],
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Interview] PATCH error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
