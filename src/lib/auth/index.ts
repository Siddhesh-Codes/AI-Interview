// ============================================================
// Auth.js (NextAuth v5) Configuration
// Provider: Credentials (email/password)
// ============================================================

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { d1QueryFirst } from '@/lib/db/d1';
import { rateLimit } from '@/lib/rate-limit';

// Extend the default session/JWT types
declare module 'next-auth' {
    interface User {
        role?: string;
        orgId?: string;
        orgSlug?: string;
        fullName?: string;
    }
    interface Session {
        user: {
            id: string;
            email: string;
            name?: string | null;
            image?: string | null;
            role: string;
            orgId: string;
            orgSlug: string;
        };
    }
}

declare module 'next-auth' {
    interface JWT {
        role?: string;
        orgId?: string;
        orgSlug?: string;
    }
}

interface DbUser {
    id: string;
    email: string;
    full_name: string;
    password_hash: string | null;
    role: string;
    org_id: string;
    is_active: number;
    avatar_url: string | null;
}

interface DbOrg {
    slug: string;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    pages: {
        signIn: '/admin/login',
        error: '/admin/login',
    },
    session: {
        strategy: 'jwt',
        maxAge: 24 * 60 * 60, // 24 hours
    },
    providers: [
        Credentials({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                const email = credentials?.email as string;
                const password = credentials?.password as string;

                if (!email || !password) return null;

                // Normalize email once for consistent lookups and rate limiting
                const normalizedEmail = email.toLowerCase().trim();

                // Rate-limit login attempts: 5 per minute per email
                const rl = rateLimit('login', normalizedEmail, 5, 60_000);
                if (rl.limited) {
                    console.log('[Auth] Login rate-limited for', normalizedEmail.replace(/(.{2}).*(@.*)/, '$1***$2'));
                    return null;
                }

                // Find user by email
                const user = await d1QueryFirst<DbUser>(
                    'SELECT id, email, full_name, password_hash, role, org_id, is_active, avatar_url FROM users WHERE LOWER(email) = ?',
                    [normalizedEmail],
                );

                if (!user || !user.is_active || !user.password_hash) return null;

                // Verify password
                const valid = await compare(password, user.password_hash);
                if (!valid) return null;

                // Verify admin role
                const adminRoles = ['super_admin', 'org_admin', 'interviewer', 'reviewer'];
                if (!adminRoles.includes(user.role)) return null;

                // Get org slug
                const org = await d1QueryFirst<DbOrg>(
                    'SELECT slug FROM organizations WHERE id = ?',
                    [user.org_id],
                );

                // Update last login
                await d1QueryFirst(
                    'UPDATE users SET last_login_at = datetime(\'now\') WHERE id = ?',
                    [user.id],
                );

                return {
                    id: user.id,
                    email: user.email,
                    name: user.full_name,
                    image: user.avatar_url,
                    role: user.role,
                    orgId: user.org_id,
                    orgSlug: org?.slug || 'app',
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.orgId = user.orgId;
                token.orgSlug = user.orgSlug;
            }
            return token;
        },
        async session({ session, token }) {
            if (token.sub) {
                session.user.id = token.sub;
                session.user.role = (token.role as string) || 'reviewer';
                session.user.orgId = (token.orgId as string) || '';
                session.user.orgSlug = (token.orgSlug as string) || '';
            }
            return session;
        },
    },
});
