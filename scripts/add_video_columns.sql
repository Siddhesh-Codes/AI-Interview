-- ============================================================
-- Migration: Add video recording columns to interview_sessions
-- Run this against your Cloudflare D1 database
-- ============================================================

ALTER TABLE interview_sessions ADD COLUMN video_url TEXT;
ALTER TABLE interview_sessions ADD COLUMN video_expires_at TEXT;

-- Index for cleanup queries (find expired videos efficiently)
CREATE INDEX IF NOT EXISTS idx_sessions_video_expiry ON interview_sessions(video_expires_at)
  WHERE video_url IS NOT NULL;
