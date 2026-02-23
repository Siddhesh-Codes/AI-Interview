// ============================================================
// Run D1 Migration: Add video columns to interview_sessions
// Usage: node scripts/migrate-d1-video.js
// Requires: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_D1_API_TOKEN
// These are read from .env.local in the project root.
// ============================================================

const fs = require('fs');
const path = require('path');

// Simple .env.local parser
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.warn('No .env.local found, relying on process.env');
    return;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID;
const API_TOKEN = process.env.CLOUDFLARE_D1_API_TOKEN;

if (!ACCOUNT_ID || !DATABASE_ID || !API_TOKEN) {
  console.error('Missing required env vars: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_D1_API_TOKEN');
  process.exit(1);
}

const D1_API_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

async function runSQL(sql) {
  const res = await fetch(D1_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql }),
  });

  const data = await res.json();
  if (!data.success) {
    const errMsg = data.errors?.map(e => e.message).join(', ') || 'Unknown error';
    throw new Error(errMsg);
  }
  return data;
}

async function main() {
  console.log('Running D1 migration: add video columns...\n');

  const statements = [
    {
      label: 'Add video_url column',
      sql: `ALTER TABLE interview_sessions ADD COLUMN video_url TEXT;`,
    },
    {
      label: 'Add video_expires_at column',
      sql: `ALTER TABLE interview_sessions ADD COLUMN video_expires_at TEXT;`,
    },
    {
      label: 'Create video expiry index',
      sql: `CREATE INDEX IF NOT EXISTS idx_sessions_video_expiry ON interview_sessions(video_expires_at) WHERE video_url IS NOT NULL;`,
    },
  ];

  for (const stmt of statements) {
    try {
      await runSQL(stmt.sql);
      console.log(`  ✓ ${stmt.label}`);
    } catch (err) {
      // "duplicate column name" means column already exists — safe to ignore
      if (err.message.includes('duplicate column')) {
        console.log(`  ⊘ ${stmt.label} (already exists, skipping)`);
      } else {
        console.error(`  ✗ ${stmt.label}: ${err.message}`);
      }
    }
  }

  console.log('\nMigration complete!');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
