// ============================================================
// API: Dashboard Stats
// GET /api/v1/dashboard
// ============================================================

import { NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/auth/server';
import { d1QueryFirst } from '@/lib/db/d1';

export async function GET() {
  try {
    const auth = await authenticateAdmin();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { orgId } = auth;

    // Total interviews
    const totalInterviews = await d1QueryFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM interview_sessions WHERE org_id = ?',
      [orgId],
    );

    // Completed interviews
    const completedInterviews = await d1QueryFirst<{ count: number }>(
      "SELECT COUNT(*) as count FROM interview_sessions WHERE org_id = ? AND status IN ('completed', 'evaluated', 'reviewed')",
      [orgId],
    );

    // Active (in_progress) interviews
    const activeInterviews = await d1QueryFirst<{ count: number }>(
      "SELECT COUNT(*) as count FROM interview_sessions WHERE org_id = ? AND status = 'in_progress'",
      [orgId],
    );

    // Average score
    const avgScore = await d1QueryFirst<{ avg: number | null }>(
      'SELECT AVG(total_score) as avg FROM interview_sessions WHERE org_id = ? AND total_score IS NOT NULL',
      [orgId],
    );

    // Total candidates
    const totalCandidates = await d1QueryFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM candidates WHERE org_id = ?',
      [orgId],
    );

    // Total job roles
    const totalRoles = await d1QueryFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM job_roles WHERE org_id = ? AND is_active = 1',
      [orgId],
    );

    // Recent interviews (last 5)
    const recentInterviews = await d1QueryFirst<{ results: string }>(
      `SELECT json_group_array(json_object(
        'id', s.id,
        'status', s.status,
        'total_score', s.total_score,
        'created_at', s.created_at,
        'candidate_name', c.full_name,
        'candidate_email', c.email,
        'role_title', r.title
      )) as results
      FROM (SELECT * FROM interview_sessions WHERE org_id = ? ORDER BY created_at DESC LIMIT 5) s
      LEFT JOIN candidates c ON s.candidate_id = c.id
      LEFT JOIN job_roles r ON s.role_id = r.id`,
      [orgId],
    );

    // Score distribution
    const scoreDistribution = await d1QueryFirst<{ results: string }>(
      `SELECT json_group_array(json_object(
        'range', range_label,
        'count', cnt
      )) as results FROM (
        SELECT
          CASE
            WHEN total_score >= 80 THEN '80-100'
            WHEN total_score >= 60 THEN '60-79'
            WHEN total_score >= 40 THEN '40-59'
            WHEN total_score >= 20 THEN '20-39'
            ELSE '0-19'
          END as range_label,
          COUNT(*) as cnt
        FROM interview_sessions
        WHERE org_id = ? AND total_score IS NOT NULL
        GROUP BY range_label
      )`,
      [orgId],
    );

    let recent = [];
    try {
      recent = JSON.parse(recentInterviews?.results || '[]');
      // Filter out null entries from json_group_array when no rows
      if (recent.length === 1 && recent[0].id === null) recent = [];
    } catch { /* empty */ }

    let distribution = [];
    try {
      distribution = JSON.parse(scoreDistribution?.results || '[]');
      if (distribution.length === 1 && distribution[0].range === null) distribution = [];
    } catch { /* empty */ }

    // Reshape recent interviews to match frontend expected structure
    const recentSessions = recent.map((r: Record<string, unknown>) => ({
      id: r.id,
      status: r.status,
      total_score: r.total_score,
      ai_recommendation: r.ai_recommendation || null,
      created_at: r.created_at,
      candidate: r.candidate_name ? { full_name: r.candidate_name, email: r.candidate_email } : null,
      job_role: r.role_title ? { title: r.role_title } : null,
    }));

    return NextResponse.json({
      stats: {
        total_interviews: totalInterviews?.count || 0,
        completed_interviews: completedInterviews?.count || 0,
        pending_reviews: 0,
        average_score: avgScore?.avg ? Math.round(avgScore.avg * 10) / 10 : null,
        active_interviews: activeInterviews?.count || 0,
        total_candidates: totalCandidates?.count || 0,
        total_roles: totalRoles?.count || 0,
        interviews_this_week: 0,
        completion_rate: totalInterviews?.count
          ? Math.round(((completedInterviews?.count || 0) / totalInterviews.count) * 100)
          : 0,
      },
      recent_sessions: recentSessions,
      score_distribution: distribution,
    });
  } catch (err) {
    console.error('[Dashboard] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
