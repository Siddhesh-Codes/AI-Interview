// ============================================================
// Auth Server Helper — authenticateAdmin()
// Returns { user, orgId, orgSlug } for authenticated admin requests
// Uses auth() session + DB fallback for robustness
// ============================================================

import { auth } from '@/lib/auth';
import { d1QueryFirst } from '@/lib/db/d1';

interface AuthResult {
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
    };
    orgId: string;
    orgSlug: string;
}

interface DbUser {
    id: string;
    email: string;
    full_name: string;
    role: string;
    org_id: string;
    is_active: number;
}

interface DbOrg {
    slug: string;
}

/**
 * Authenticate an admin user from an API route or server component.
 * Returns the authenticated user info or null if not authenticated.
 * 
 * Always resolves org info from the database for reliability,
 * so sessions created before config changes still work.
 */
export async function authenticateAdmin(): Promise<AuthResult | null> {
    try {
        const session = await auth();

        // Debug logging
        console.log('[Auth] Session check:', JSON.stringify({
            hasSession: !!session,
            hasUser: !!session?.user,
            userId: session?.user?.id || 'none',
            email: session?.user?.email || 'none',
            role: session?.user?.role || 'none',
            orgId: session?.user?.orgId || 'none',
        }));

        // Must have some session
        if (!session?.user) {
            console.log('[Auth] No session found');
            return null;
        }

        const userId = session.user.id;
        const userEmail = session.user.email;

        // We need at least an ID or email to look up the user
        if (!userId && !userEmail) {
            console.log('[Auth] No user ID or email in session');
            return null;
        }

        // ALWAYS look up from DB for reliability (handles old JWTs gracefully)
        const dbUser = await d1QueryFirst<DbUser>(
            'SELECT id, email, full_name, role, org_id, is_active FROM users WHERE id = ? OR email = ?',
            [userId || '', userEmail || ''],
        );

        if (!dbUser) {
            console.log('[Auth] User not found in DB:', { userId, userEmail });
            return null;
        }

        if (!dbUser.is_active) {
            console.log('[Auth] User is deactivated:', dbUser.id);
            return null;
        }

        // Verify admin role
        const adminRoles = ['super_admin', 'org_admin', 'interviewer', 'reviewer'];
        if (!adminRoles.includes(dbUser.role)) {
            console.log('[Auth] User does not have admin role:', dbUser.role);
            return null;
        }

        // Get org slug
        const org = await d1QueryFirst<DbOrg>(
            'SELECT slug FROM organizations WHERE id = ?',
            [dbUser.org_id],
        );

        if (!org) {
            console.log('[Auth] Org not found for user:', dbUser.org_id);
            return null;
        }

        return {
            user: {
                id: dbUser.id,
                email: dbUser.email,
                name: dbUser.full_name,
                role: dbUser.role,
            },
            orgId: dbUser.org_id,
            orgSlug: org.slug,
        };
    } catch (error) {
        console.error('[Auth] authenticateAdmin error:', error);
        return null;
    }
}
