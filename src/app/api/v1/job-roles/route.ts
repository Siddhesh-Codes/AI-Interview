// ============================================================
// API: Job Roles — CRUD + DELETE
// GET /api/v1/job-roles — List roles for the org
// POST /api/v1/job-roles — Create role
// PUT /api/v1/job-roles?id=<uuid> — Update role
// DELETE /api/v1/job-roles?id=<uuid> — Soft-delete role
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/auth/server';
import { d1Query, d1QueryFirst, d1Run, generateId, nowISO } from '@/lib/db/d1';
import { createJobRoleSchema, updateJobRoleSchema } from '@/types/schemas';

export async function GET() {
  try {
    const auth = await authenticateAdmin();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const roles = await d1Query(
      `SELECT jr.*, COUNT(qt.id) as question_count
       FROM job_roles jr
       LEFT JOIN question_templates qt ON qt.role_id = jr.id AND qt.is_active = 1
       WHERE jr.org_id = ? AND jr.is_active = 1
       GROUP BY jr.id
       ORDER BY jr.created_at DESC`,
      [auth.orgId],
    );

    return NextResponse.json({ roles });
  } catch (err) {
    console.error('[JobRoles] GET error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAdmin();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = createJobRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const id = generateId();
    const { title, department, description } = parsed.data;

    await d1Run(
      `INSERT INTO job_roles (id, org_id, title, department, description, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, auth.orgId, title, department || '', description || '', auth.user.id, nowISO()],
    );

    const role = await d1QueryFirst(
      'SELECT * FROM job_roles WHERE id = ?',
      [id],
    );

    return NextResponse.json(role, { status: 201 });
  } catch (err) {
    console.error('[JobRoles] POST error:', err);
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
    const parsed = updateJobRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { title, department, description } = parsed.data;

    // Build dynamic UPDATE for PATCH semantics — only set provided fields
    const setClauses: string[] = [];
    const values: unknown[] = [];
    if (title !== undefined) { setClauses.push('title = ?'); values.push(title); }
    if (department !== undefined) { setClauses.push('department = ?'); values.push(department); }
    if (description !== undefined) { setClauses.push('description = ?'); values.push(description); }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id, auth.orgId);
    await d1Run(
      `UPDATE job_roles SET ${setClauses.join(', ')} WHERE id = ? AND org_id = ?`,
      values,
    );

    const role = await d1QueryFirst(
      'SELECT * FROM job_roles WHERE id = ? AND org_id = ?',
      [id, auth.orgId],
    );

    return NextResponse.json(role);
  } catch (err) {
    console.error('[JobRoles] PUT error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateAdmin();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });

    // Soft delete
    await d1Run(
      'UPDATE job_roles SET is_active = 0 WHERE id = ? AND org_id = ?',
      [id, auth.orgId],
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[JobRoles] DELETE error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
