// ============================================================
// Middleware — Lightweight route protection + CSRF defense
// Does NOT use auth() wrapper to avoid session conflicts
// ============================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── CSRF protection for state-changing API requests ──
  if (pathname.startsWith('/api/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');

    if (host) {
      let verified = false;

      // Check Origin header first
      if (origin) {
        try {
          if (new URL(origin).host === host) verified = true;
        } catch { /* malformed origin */ }
      }

      // Fall back to Referer header
      if (!verified && referer) {
        try {
          if (new URL(referer).host === host) verified = true;
        } catch { /* malformed referer */ }
      }

      // If neither header provided a matching host, block the request
      if (!verified && (origin || referer)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // If neither Origin nor Referer is present (e.g., server-to-server),
      // allow through — SameSite cookies already protect browser requests.
    }
  }

  // ── Admin route protection ──
  const isAdminRoute =
    pathname.match(/^\/[^/]+\/(interviews|candidates|job-roles|questions|settings|audit|team)/) ||
    (pathname.match(/^\/[^/]+$/) && !pathname.startsWith('/admin') && !pathname.startsWith('/interview') && !pathname.startsWith('/setup') && !pathname.startsWith('/login') && !pathname.startsWith('/auth'));

  if (isAdminRoute) {
    // Check for auth session cookie (authjs.session-token or __Secure-authjs.session-token)
    const hasSession =
      request.cookies.has('authjs.session-token') ||
      request.cookies.has('__Secure-authjs.session-token') ||
      request.cookies.has('next-auth.session-token') ||
      request.cookies.has('__Secure-next-auth.session-token');

    if (!hasSession) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match admin routes and API mutation routes
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
