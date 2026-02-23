// ============================================================
// API: Questions — CRUD
// GET /api/v1/questions — List questions (filterable by role)
// POST /api/v1/questions — Create question
// PUT /api/v1/questions?id=<uuid> — Update question
// DELETE /api/v1/questions?id=<uuid> — Soft-delete question
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/auth/server';
import { d1Query, d1QueryFirst, d1Run, generateId, nowISO } from '@/lib/db/d1';
import { createQuestionSchema, updateQuestionSchema } from '@/types/schemas';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdmin();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const roleId = request.nextUrl.searchParams.get('role_id');

    let questions;
    if (roleId) {
      questions = await d1Query(
        `SELECT qt.*, jr.title as role_title
         FROM question_templates qt
         LEFT JOIN job_roles jr ON jr.id = qt.role_id
         WHERE qt.org_id = ? AND qt.role_id = ? AND qt.is_active = 1
         ORDER BY qt.order_index ASC`,
        [auth.orgId, roleId],
      );
    } else {
      questions = await d1Query(
        `SELECT qt.*, jr.title as role_title
         FROM question_templates qt
         LEFT JOIN job_roles jr ON jr.id = qt.role_id
         WHERE qt.org_id = ? AND qt.is_active = 1
         ORDER BY jr.title ASC, qt.order_index ASC`,
        [auth.orgId],
      );
    }

    // Reshape to include nested job_role for frontend grouping
    const shaped = questions.map((q: Record<string, unknown>) => ({
      ...q,
      job_role: q.role_title ? { id: q.role_id, title: q.role_title } : null,
    }));

    return NextResponse.json({ questions: shaped });
  } catch (err) {
    console.error('[Questions] GET error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAdmin();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = createQuestionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const id = generateId();
    const { role_id, question_text, category, difficulty, time_limit_seconds, order_index } = parsed.data;

    await d1Run(
      `INSERT INTO question_templates (id, org_id, role_id, question_text, category, difficulty, time_limit_seconds, order_index, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, auth.orgId, role_id, question_text, category || 'behavioral', difficulty || 'medium', time_limit_seconds || 120, order_index || 0, auth.user.id, nowISO()],
    );

    const question = await d1QueryFirst(
      'SELECT * FROM question_templates WHERE id = ?',
      [id],
    );

    return NextResponse.json(question, { status: 201 });
  } catch (err) {
    console.error('[Questions] POST error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateAdmin();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });

    const body = await request.json();
    const parsed = updateQuestionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { question_text, category, difficulty, time_limit_seconds, order_index } = parsed.data;

    await d1Run(
      `UPDATE question_templates SET question_text = ?, category = ?, difficulty = ?, time_limit_seconds = ?, order_index = ?
       WHERE id = ? AND org_id = ?`,
      [question_text, category, difficulty, time_limit_seconds, order_index, id, auth.orgId],
    );

    const question = await d1QueryFirst(
      'SELECT * FROM question_templates WHERE id = ? AND org_id = ?',
      [id, auth.orgId],
    );

    return NextResponse.json(question);
  } catch (err) {
    console.error('[Questions] PUT error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateAdmin();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });

    await d1Run(
      'UPDATE question_templates SET is_active = 0 WHERE id = ? AND org_id = ?',
      [id, auth.orgId],
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Questions] DELETE error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
