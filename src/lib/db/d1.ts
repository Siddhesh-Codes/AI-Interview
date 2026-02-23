// ============================================================
// Cloudflare D1 REST API Client
// Executes SQL queries against D1 from Vercel serverless functions
// ============================================================

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID!;
const API_TOKEN = process.env.CLOUDFLARE_D1_API_TOKEN!;

const D1_API_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

export interface D1Result<T = Record<string, unknown>> {
    results: T[];
    success: boolean;
    meta: {
        changes: number;
        duration: number;
        last_row_id: number;
        rows_read: number;
        rows_written: number;
    };
}

interface D1Response<T = Record<string, unknown>> {
    result: D1Result<T>[];
    success: boolean;
    errors: Array<{ code: number; message: string }>;
    messages: string[];
}

/**
 * Execute a raw SQL query against Cloudflare D1
 */
export async function d1Execute<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
): Promise<D1Result<T>> {
    const response = await fetch(D1_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql, params }),
    });

    if (!response.ok) {
        const text = await response.text();
        console.error('[D1] HTTP error:', response.status, text);
        throw new Error(`D1 query failed: ${response.status} ${text}`);
    }

    const data: D1Response<T> = await response.json();

    if (!data.success) {
        const errMsg = data.errors?.map((e) => e.message).join(', ') || 'Unknown D1 error';
        console.error('[D1] Query error:', errMsg);
        throw new Error(`D1 error: ${errMsg}`);
    }

    return data.result[0];
}

/**
 * Execute a SELECT query and return the results array
 */
export async function d1Query<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
): Promise<T[]> {
    const result = await d1Execute<T>(sql, params);
    return result.results;
}

/**
 * Execute a SELECT query and return the first result (or null)
 */
export async function d1QueryFirst<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
): Promise<T | null> {
    const results = await d1Query<T>(sql, params);
    return results[0] ?? null;
}

/**
 * Execute an INSERT/UPDATE/DELETE query and return the meta info
 */
export async function d1Run(
    sql: string,
    params: unknown[] = [],
): Promise<{ changes: number; lastRowId: number }> {
    const result = await d1Execute(sql, params);
    return {
        changes: result.meta.changes,
        lastRowId: result.meta.last_row_id,
    };
}

/**
 * Execute multiple SQL statements in a batch (single HTTP request)
 */
export async function d1Batch(
    statements: Array<{ sql: string; params?: unknown[] }>,
): Promise<D1Result[]> {
    // D1 REST API supports batch via array of statements
    const response = await fetch(D1_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(
            statements.map((s) => ({ sql: s.sql, params: s.params || [] })),
        ),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`D1 batch failed: ${response.status} ${text}`);
    }

    const data: D1Response = await response.json();
    if (!data.success) {
        const errMsg = data.errors?.map((e) => e.message).join(', ') || 'Unknown D1 error';
        throw new Error(`D1 batch error: ${errMsg}`);
    }

    return data.result;
}

/**
 * Generate a UUID v4 (for use as primary key)
 */
export function generateId(): string {
    return crypto.randomUUID();
}

/**
 * Get current ISO-8601 datetime string
 */
export function nowISO(): string {
    return new Date().toISOString();
}

/**
 * Get ISO-8601 datetime string for N days from now
 */
export function futureISO(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
}

/**
 * Parse a JSON string column, returning the parsed object or a fallback
 */
export function parseJsonColumn<T>(value: string | null | undefined, fallback: T): T {
    if (!value) return fallback;
    try {
        return JSON.parse(value) as T;
    } catch {
        return fallback;
    }
}
