// ============================================================
// In-Memory Rate Limiter (Sliding Window)
// Works in serverless — provides per-instance protection.
// For distributed rate limiting, swap with Upstash/Redis.
// ============================================================

interface RateLimitEntry {
  timestamps: number[];
  windowMs: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

// Auto-cleanup every 5 minutes to prevent memory leaks
let cleanupScheduled = false;
function scheduleCleanup() {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  setInterval(() => {
    const now = Date.now();
    for (const [, store] of stores) {
      for (const [key, entry] of store) {
        // Remove entries outside their configured window (fall back to 10 min)
        const threshold = entry.windowMs || 600_000;
        entry.timestamps = entry.timestamps.filter((t) => now - t < threshold);
        if (entry.timestamps.length === 0) store.delete(key);
      }
    }
  }, 300_000);
}

function getStore(name: string): Map<string, RateLimitEntry> {
  let store = stores.get(name);
  if (!store) {
    store = new Map();
    stores.set(name, store);
    scheduleCleanup();
  }
  return store;
}

/**
 * Check if a request should be rate-limited.
 * @param name    Name of the rate limiter (e.g. 'login', 'tts')
 * @param key     Identifier (e.g. IP address, email)
 * @param limit   Max requests allowed in the window
 * @param windowMs  Window duration in milliseconds
 * @returns { limited: boolean, remaining: number, retryAfterMs: number }
 */
export function rateLimit(
  name: string,
  key: string,
  limit: number,
  windowMs: number,
): { limited: boolean; remaining: number; retryAfterMs: number } {
  const store = getStore(name);
  const now = Date.now();
  const windowStart = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [], windowMs };
    store.set(key, entry);
  } else {
    entry.windowMs = windowMs;
  }

  // Remove timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= limit) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + windowMs - now;
    return { limited: true, remaining: 0, retryAfterMs: Math.max(retryAfterMs, 0) };
  }

  entry.timestamps.push(now);
  return { limited: false, remaining: limit - entry.timestamps.length, retryAfterMs: 0 };
}

/**
 * Extract client IP from request headers (Vercel forwards these).
 * Returns null when IP cannot be determined — callers should skip
 * rate limiting or use an alternative identifier.
 */
export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return null;
}

/**
 * Helper — return a 429 JSON response with retry info.
 */
export function rateLimitResponse(retryAfterMs: number) {
  const retryAfterSec = Math.ceil(retryAfterMs / 1000);
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSec),
      },
    },
  );
}
