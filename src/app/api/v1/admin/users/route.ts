// ============================================================
// API: Admin Users — Team Management
// GET /api/v1/admin/users — List admin users for org
// POST /api/v1/admin/users — Create new admin user
// DELETE /api/v1/admin/users?id=<uuid> — Remove admin user
//
// Access Control:
// - super_admin: sees all users, can create/delete any (except self)
// - org_admin: sees non-super-admin users, can create/delete below
// - interviewer/reviewer: no access (403)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/auth/server';
import { d1Query, d1QueryFirst, d1Run, generateId, nowISO } from '@/lib/db/d1';
import { hash } from 'bcryptjs';
import { sendAdminWelcome } from '@/lib/email';

// Roles that can manage team members
const MANAGER_ROLES = ['super_admin', 'org_admin'];

export async function GET() {
    try {
        const auth = await authenticateAdmin();
        if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        if (!MANAGER_ROLES.includes(auth.user.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        let users;
        if (auth.user.role === 'super_admin') {
            // Super admin sees everyone
            users = await d1Query(
                `SELECT id, email, full_name, role, is_active, avatar_url, last_login_at, created_at
         FROM users
         WHERE org_id = ?
         ORDER BY
           CASE role
             WHEN 'super_admin' THEN 1
             WHEN 'org_admin' THEN 2
             WHEN 'interviewer' THEN 3
             WHEN 'reviewer' THEN 4
           END,
           created_at ASC`,
                [auth.orgId],
            );
        } else {
            // org_admin sees everyone except super_admins
            users = await d1Query(
                `SELECT id, email, full_name, role, is_active, avatar_url, last_login_at, created_at
         FROM users
         WHERE org_id = ? AND role != 'super_admin'
         ORDER BY
           CASE role
             WHEN 'org_admin' THEN 1
             WHEN 'interviewer' THEN 2
             WHEN 'reviewer' THEN 3
           END,
           created_at ASC`,
                [auth.orgId],
            );
        }

        return NextResponse.json({ users, currentUserRole: auth.user.role });
    } catch (err) {
        console.error('[Admin Users] GET error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await authenticateAdmin();
        if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        if (!MANAGER_ROLES.includes(auth.user.role)) {
            return NextResponse.json(
                { error: 'Only admins can create team members' },
                { status: 403 },
            );
        }

        const body = await request.json();
        const { email, full_name, password, role } = body;

        // Validate required fields
        if (!email || !full_name || !password || !role) {
            return NextResponse.json(
                { error: 'Missing required fields: email, full_name, password, role' },
                { status: 400 },
            );
        }

        // Role hierarchy enforcement
        const allowedByRole: Record<string, string[]> = {
            super_admin: ['super_admin', 'org_admin', 'interviewer', 'reviewer'],
            org_admin: ['interviewer', 'reviewer'],
        };

        const allowed = allowedByRole[auth.user.role] || [];
        if (!allowed.includes(role)) {
            return NextResponse.json(
                { error: `You don't have permission to create a ${role} account` },
                { status: 403 },
            );
        }

        // Validate password
        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters' },
                { status: 400 },
            );
        }

        // Check if email already exists
        const existing = await d1QueryFirst<{ id: string }>(
            'SELECT id FROM users WHERE email = ?',
            [email],
        );
        if (existing) {
            return NextResponse.json(
                { error: 'A user with this email already exists' },
                { status: 409 },
            );
        }

        // Create user
        const id = generateId();
        const passwordHash = await hash(password, 12);

        await d1Run(
            `INSERT INTO users (id, org_id, email, full_name, password_hash, role, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
            [id, auth.orgId, email, full_name, passwordHash, role, nowISO()],
        );

        // Send welcome email (non-blocking)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        sendAdminWelcome({
            to: email,
            name: full_name,
            role,
            loginUrl: `${appUrl}/admin/login`,
            tempPassword: password,
        }).catch((err) => console.error('[Admin Users] Failed to send welcome email:', err));

        const user = await d1QueryFirst(
            'SELECT id, email, full_name, role, is_active, created_at FROM users WHERE id = ?',
            [id],
        );

        return NextResponse.json({ user }, { status: 201 });
    } catch (err) {
        console.error('[Admin Users] POST error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const auth = await authenticateAdmin();
        if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        if (!MANAGER_ROLES.includes(auth.user.role)) {
            return NextResponse.json(
                { error: 'Only admins can remove team members' },
                { status: 403 },
            );
        }

        const id = request.nextUrl.searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });

        // Cannot delete yourself
        if (id === auth.user.id) {
            return NextResponse.json(
                { error: 'You cannot delete your own account' },
                { status: 400 },
            );
        }

        // Verify user belongs to same org
        const targetUser = await d1QueryFirst<{ id: string; role: string }>(
            'SELECT id, role FROM users WHERE id = ? AND org_id = ?',
            [id, auth.orgId],
        );

        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // org_admin cannot delete super_admin or other org_admins
        if (auth.user.role === 'org_admin' && ['super_admin', 'org_admin'].includes(targetUser.role)) {
            return NextResponse.json(
                { error: 'You don\'t have permission to delete this user' },
                { status: 403 },
            );
        }

        // Nobody can delete a super_admin except another super_admin
        if (targetUser.role === 'super_admin' && auth.user.role !== 'super_admin') {
            return NextResponse.json(
                { error: 'Cannot delete a super admin' },
                { status: 403 },
            );
        }

        await d1Run('DELETE FROM users WHERE id = ? AND org_id = ?', [id, auth.orgId]);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[Admin Users] DELETE error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
