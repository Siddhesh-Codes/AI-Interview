// ============================================================
// API: Setup — Create initial super admin account
// POST /api/setup — Secured: only works when no super_admin exists
// PATCH /api/setup — Requires authentication
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { d1QueryFirst, d1Run, generateId, nowISO } from '@/lib/db/d1';

// Credentials come ONLY from env vars — never hardcoded
const SETUP_EMAIL = (process.env.SETUP_ADMIN_EMAIL || '').trim();
const SETUP_PASSWORD = (process.env.SETUP_ADMIN_PASSWORD || '').trim();

/** Derive a clean slug from an email domain (e.g. siddhesh@labdox.in → labdox) */
function slugFromEmail(email: string): string {
  const domain = email.split('@')[1] || 'company';
  return domain.split('.')[0].toLowerCase().replace(/[^a-z0-9-]/g, '');
}

export async function POST(request: NextRequest) {
  try {
    // Parse body
    let body: { email?: string; password?: string } = {};
    try {
      body = await request.json();
    } catch {
      // No body
    }

    // Use env vars as defaults, allow override from body
    const email = (body.email || SETUP_EMAIL).trim();
    const password = (body.password || SETUP_PASSWORD).trim();

    // Validate inputs
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // SECURITY: Only allow setup if no super_admin exists yet
    const existingSuperAdmin = await d1QueryFirst<{ id: string }>(
      "SELECT id FROM users WHERE role = 'super_admin' LIMIT 1",
    );

    if (existingSuperAdmin) {
      return NextResponse.json(
        { error: 'Setup already completed. A super admin already exists. Please log in instead.' },
        { status: 409 },
      );
    }

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

    // Create the super admin user
    const userId = generateId();
    const passwordHash = await hash(password, 12);
    await d1Run(
      `INSERT INTO users (id, org_id, email, full_name, password_hash, role, created_at)
       VALUES (?, ?, ?, 'Admin', ?, 'super_admin', ?)`,
      [userId, orgId, email, passwordHash, nowISO()],
    );

    // Get the org slug for the response
    const orgAfterSetup = await d1QueryFirst<{ slug: string }>(
      'SELECT slug FROM organizations LIMIT 1',
    );

    // Never return credentials in the response
    return NextResponse.json({
      success: true,
      message: 'Super admin created. Please log in.',
      dashboard: `/${orgAfterSetup?.slug || 'app'}`,
    });
  } catch (err) {
    console.error('Setup error:', err);
    return NextResponse.json(
      { error: 'Setup failed. Please try again.' },
      { status: 500 },
    );
  }
}

export async function GET() {
  // Don't expose any credentials
  return NextResponse.json({
    info: 'POST with { email, password } to create the initial super admin.',
    note: 'Only works once — locked after first super admin is created.',
  });
}

/** PATCH — Update organization slug and name (requires auth) */
export async function PATCH(request: NextRequest) {
  try {
    const { authenticateAdmin } = await import('@/lib/auth/server');
    const auth = await authenticateAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      'UPDATE organizations SET slug = ?, name = COALESCE(?, name) WHERE id = ?',
      [cleanSlug, name || null, auth.orgId],
    );

    return NextResponse.json({ success: true, slug: cleanSlug, name });
  } catch (err) {
    console.error('PATCH setup error:', err);
    return NextResponse.json(
      { error: 'Update failed' },
      { status: 500 },
    );
  }
}
