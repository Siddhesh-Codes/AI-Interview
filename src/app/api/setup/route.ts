// ============================================================
// API: Setup — Create initial admin account
// POST /api/setup — Create org + admin user in D1
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { d1QueryFirst, d1Run, generateId, nowISO } from '@/lib/db/d1';

const DEFAULT_EMAIL = 'admin@company.com';
const DEFAULT_PASSWORD = 'admin123456';

/** Derive a clean slug from an email domain (e.g. siddhesh@labdox.in → labdox) */
function slugFromEmail(email: string): string {
  const domain = email.split('@')[1] || 'company';
  // Use the first part of the domain (e.g. labdox from labdox.in)
  return domain.split('.')[0].toLowerCase().replace(/[^a-z0-9-]/g, '');
}

export async function POST(request: NextRequest) {
  try {
    // Allow custom email/password via body
    let email = DEFAULT_EMAIL;
    let password = DEFAULT_PASSWORD;
    try {
      const body = await request.json();
      if (body.email) email = body.email;
      if (body.password) password = body.password;
    } catch {
      // No body — use defaults
    }

    // Check if user already exists
    const existingUser = await d1QueryFirst<{ id: string }>(
      'SELECT id FROM users WHERE email = ?',
      [email],
    );

    let userId: string;

    if (existingUser) {
      // Update password
      const passwordHash = await hash(password, 12);
      await d1Run(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [passwordHash, existingUser.id],
      );
      userId = existingUser.id;
    } else {
      // Derive org slug from email domain
      const slug = slugFromEmail(email);
      const orgName = slug.charAt(0).toUpperCase() + slug.slice(1);

      // Find or create the org
      let orgId: string;
      const existingOrg = await d1QueryFirst<{ id: string }>(
        'SELECT id FROM organizations LIMIT 1',
      );

      if (existingOrg) {
        orgId = existingOrg.id;
        // Update slug if it's still 'demo'
        await d1Run(
          `UPDATE organizations SET slug = ?, name = ? WHERE id = ? AND slug = 'demo'`,
          [slug, orgName, orgId],
        );
      } else {
        orgId = generateId();
        await d1Run(
          `INSERT INTO organizations (id, name, slug, brand_color, plan, created_at)
           VALUES (?, ?, ?, '#7c3aed', 'free', ?)`,
          [orgId, orgName, slug, nowISO()],
        );
      }

      // Create admin user with hashed password
      userId = generateId();
      const passwordHash = await hash(password, 12);
      await d1Run(
        `INSERT INTO users (id, org_id, email, full_name, password_hash, role, created_at)
         VALUES (?, ?, ?, 'Admin User', ?, 'super_admin', ?)`,
        [userId, orgId, email, passwordHash, nowISO()],
      );
    }

    // Get the org slug for the response
    const orgAfterSetup = await d1QueryFirst<{ slug: string }>(
      'SELECT slug FROM organizations LIMIT 1',
    );

    return NextResponse.json({
      success: true,
      message: 'Admin user created successfully',
      credentials: { email, password },
      dashboard: `/${orgAfterSetup?.slug || 'app'}`,
    });
  } catch (err) {
    console.error('Setup error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Setup failed' },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    info: 'POST to this endpoint to create an admin user',
    credentials: {
      email: DEFAULT_EMAIL,
      password: DEFAULT_PASSWORD,
    },
  });
}

/** PATCH — Update organization slug and name */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, name } = body;

    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 });
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!cleanSlug) {
      return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
    }

    await d1Run(
      'UPDATE organizations SET slug = ?, name = COALESCE(?, name) WHERE 1=1',
      [cleanSlug, name || null],
    );

    return NextResponse.json({ success: true, slug: cleanSlug, name });
  } catch (err) {
    console.error('PATCH setup error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 },
    );
  }
}
