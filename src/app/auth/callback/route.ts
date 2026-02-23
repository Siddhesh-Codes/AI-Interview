// ============================================================
// Auth Callback — Handle OAuth/Magic Link callbacks
// ============================================================

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  let next = url.searchParams.get('callbackUrl') || '/';

  // SECURITY: Prevent open redirect — only allow relative paths
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('://')) {
    next = '/';
  }

  // Auth.js handles callbacks via /api/auth/callback/[provider]
  // This route is a fallback redirect
  return NextResponse.redirect(new URL(next, url));
}
