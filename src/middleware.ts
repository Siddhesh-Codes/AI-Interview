// ============================================================
// Middleware — Lightweight route protection
// Does NOT use auth() wrapper to avoid session conflicts
// ============================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if this is a protected admin route
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
    // Match all routes except static files, API routes, and public pages
    '/((?!api|_next/static|_next/image|favicon.ico|admin/login|auth|setup|interview|login|$).*)',
  ],
};
