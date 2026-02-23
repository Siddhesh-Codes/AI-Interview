// ============================================================
// API: Candidates — CRUD + DELETE
// GET /api/v1/candidates — List candidates
// POST /api/v1/candidates — Create candidate
// DELETE /api/v1/candidates?id=<uuid> — Delete candidate
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/auth/server';
import { d1Query, d1QueryFirst, d1Run, generateId, nowISO } from '@/lib/db/d1';
import { createCandidateSchema } from '@/types/schemas';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdmin();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const search = request.nextUrl.searchParams.get('search') || '';

    let candidates;
    if (search) {
      candidates = await d1Query(
        `SELECT c.*, COUNT(s.id) as interview_count
         FROM candidates c
         LEFT JOIN interview_sessions s ON s.candidate_id = c.id
         WHERE c.org_id = ? AND (c.full_name LIKE ? OR c.email LIKE ?)
         GROUP BY c.id
         ORDER BY c.created_at DESC`,
        [auth.orgId, `%${search}%`, `%${search}%`],
      );
    } else {
      candidates = await d1Query(
        `SELECT c.*, COUNT(s.id) as interview_count
         FROM candidates c
         LEFT JOIN interview_sessions s ON s.candidate_id = c.id
         WHERE c.org_id = ?
         GROUP BY c.id
         ORDER BY c.created_at DESC`,
        [auth.orgId],
      );
    }

    return NextResponse.json({ candidates, pagination: { total: candidates.length } });
  } catch (err) {
    console.error('[Candidates] GET error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAdmin();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = createCandidateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const id = generateId();
    const { email, full_name, phone } = parsed.data;

    // Check if candidate already exists for this org
    const existing = await d1QueryFirst(
      'SELECT id FROM candidates WHERE org_id = ? AND email = ?',
      [auth.orgId, email],
    );
    if (existing) {
      return NextResponse.json({ error: 'Candidate with this email already exists' }, { status: 409 });
    }

    await d1Run(
      `INSERT INTO candidates (id, org_id, email, full_name, phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, auth.orgId, email, full_name, phone || null, nowISO()],
    );

    const candidate = await d1QueryFirst(
      'SELECT * FROM candidates WHERE id = ?',
      [id],
    );

    return NextResponse.json({ candidate }, { status: 201 });
  } catch (err) {
    console.error('[Candidates] POST error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateAdmin();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });

    // Check for existing interview sessions
    const sessions = await d1QueryFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM interview_sessions WHERE candidate_id = ? AND org_id = ?',
      [id, auth.orgId],
    );

    if (sessions && sessions.count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete candidate with existing interview sessions. Delete the interviews first.' },
        { status: 409 },
      );
    }

    await d1Run(
      'DELETE FROM candidates WHERE id = ? AND org_id = ?',
      [id, auth.orgId],
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Candidates] DELETE error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
