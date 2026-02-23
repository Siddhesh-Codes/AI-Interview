-- ============================================================
-- HR AI Interview Platform — D1 (SQLite) Schema
-- Run with: npx wrangler d1 execute hr-interviews --file=scripts/d1-schema.sql
-- ============================================================

-- ============================================================
-- 1. ORGANIZATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  brand_color TEXT NOT NULL DEFAULT '#7c3aed',
  plan TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free', 'pro', 'enterprise')),
  settings TEXT NOT NULL DEFAULT '{"default_time_limit":120,"max_questions":5,"max_tab_switches":3,"enforce_fullscreen":false,"tts_voice":"en-US-GuyNeural"}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- ============================================================
-- 2. USERS (app-managed auth, no Supabase)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'reviewer' CHECK(role IN ('super_admin', 'org_admin', 'interviewer', 'reviewer')),
  avatar_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================
-- 3. AUTH SESSIONS (for Auth.js)
-- ============================================================
CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(session_token);

-- ============================================================
-- 4. VERIFICATION TOKENS (for magic links)
-- ============================================================
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires TEXT NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- ============================================================
-- 5. JOB ROLES
-- ============================================================
CREATE TABLE IF NOT EXISTS job_roles (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_job_roles_org ON job_roles(org_id);

-- ============================================================
-- 6. QUESTION TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS question_templates (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES job_roles(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'behavioral' CHECK(category IN ('behavioral', 'technical', 'situational', 'case_study', 'introduction')),
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK(difficulty IN ('easy', 'medium', 'hard')),
  rubric TEXT NOT NULL DEFAULT '{"clarity":"How well-structured and articulate is the response?","relevance":"Does the answer directly address the question?","confidence":"How confident does the candidate sound?","technical_fit":"Does the answer demonstrate relevant skills?","communication":"How effective is the candidate''s communication?"}',
  time_limit_seconds INTEGER NOT NULL DEFAULT 120,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_questions_org_role ON question_templates(org_id, role_id);
CREATE INDEX IF NOT EXISTS idx_questions_role_order ON question_templates(role_id, order_index);

-- ============================================================
-- 7. CANDIDATES
-- ============================================================
CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  resume_url TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(org_id, email)
);

CREATE INDEX IF NOT EXISTS idx_candidates_org ON candidates(org_id);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(org_id, email);

-- ============================================================
-- 8. INTERVIEW SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS interview_sessions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES job_roles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'invited' CHECK(status IN ('invited', 'in_progress', 'completed', 'evaluated', 'reviewed', 'archived')),
  invite_token TEXT NOT NULL UNIQUE,
  invite_expires_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  total_score REAL,
  ai_recommendation TEXT CHECK(ai_recommendation IN ('strong_hire', 'hire', 'maybe', 'no_hire', 'strong_no_hire')),
  ai_summary TEXT,
  reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  reviewer_decision TEXT CHECK(reviewer_decision IN ('strong_hire', 'hire', 'maybe', 'no_hire', 'strong_no_hire')),
  reviewed_at TEXT,
  tab_switch_count INTEGER NOT NULL DEFAULT 0,
  browser_info TEXT NOT NULL DEFAULT '{}',
  video_url TEXT,
  video_expires_at TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_org_status ON interview_sessions(org_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON interview_sessions(invite_token);
CREATE INDEX IF NOT EXISTS idx_sessions_candidate ON interview_sessions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_sessions_video_expiry ON interview_sessions(video_expires_at)
  WHERE video_url IS NOT NULL;

-- ============================================================
-- 9. ANSWERS
-- ============================================================
CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES question_templates(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  audio_url TEXT,
  audio_duration_seconds REAL,
  transcript TEXT,
  ai_evaluation TEXT,
  scores TEXT,
  average_score REAL,
  strengths TEXT DEFAULT '[]',
  risks TEXT DEFAULT '[]',
  ai_recommendation TEXT,
  tab_switches_during INTEGER NOT NULL DEFAULT 0,
  submitted_at TEXT,
  evaluated_at TEXT,
  UNIQUE(session_id, question_index)
);

CREATE INDEX IF NOT EXISTS idx_answers_session ON answers(session_id);

-- ============================================================
-- 10. EVALUATION QUEUE
-- ============================================================
CREATE TABLE IF NOT EXISTS evaluation_queue (
  id TEXT PRIMARY KEY,
  answer_id TEXT NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  provider_used TEXT,
  model_used TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_eval_queue_status ON evaluation_queue(status);

-- ============================================================
-- 11. AI PROVIDER LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_provider_logs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES interview_sessions(id) ON DELETE SET NULL,
  answer_id TEXT REFERENCES answers(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK(provider IN ('groq', 'gemini', 'openai')),
  model TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('tts', 'stt', 'evaluation')),
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  cost_estimate_usd REAL NOT NULL DEFAULT 0,
  success INTEGER NOT NULL DEFAULT 1,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_org ON ai_provider_logs(org_id);

-- ============================================================
-- 12. AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  old_values TEXT,
  new_values TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(org_id);

-- ============================================================
-- 13. NOTIFICATION PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  notify_on_completion INTEGER NOT NULL DEFAULT 1,
  notify_on_review_needed INTEGER NOT NULL DEFAULT 1,
  email_digest TEXT NOT NULL DEFAULT 'realtime' CHECK(email_digest IN ('realtime', 'daily', 'weekly', 'none'))
);

-- ============================================================
-- 14. ORG INVITATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS org_invitations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'reviewer' CHECK(role IN ('super_admin', 'org_admin', 'interviewer', 'reviewer')),
  invited_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  accepted_at TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 15. SYSTEM CONFIG
-- ============================================================
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT OR IGNORE INTO system_config (key, value) VALUES
  ('maintenance_mode', '{"enabled": false}'),
  ('feature_flags', '{"edge_tts": true, "groq_evaluation": true, "gemini_fallback": true}');

-- Demo organization
INSERT OR IGNORE INTO organizations (id, name, slug, brand_color, plan) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Demo Company', 'demo', '#7c3aed', 'free');

-- Job Roles
INSERT OR IGNORE INTO job_roles (id, org_id, title, department, description) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'HR Manager', 'Human Resources', 'Human Resources management role'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Data Analyst', 'Analytics', 'Data analysis and business intelligence role'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Web Developer', 'Engineering', 'Frontend and full-stack web development role'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Software Engineer', 'Engineering', 'Software engineering and development role'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Product Manager', 'Product', 'Product management and strategy role'),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'UX Designer', 'Design', 'User experience and interface design role');

-- HR Manager Questions
INSERT OR IGNORE INTO question_templates (id, org_id, role_id, question_text, category, difficulty, order_index) VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Tell me about yourself and your experience in human resources.', 'introduction', 'easy', 0),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'How do you handle conflict resolution between employees in the workplace?', 'behavioral', 'medium', 1),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Describe your experience with HR compliance and employment law.', 'technical', 'medium', 2),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'How would you design an employee retention strategy for a growing company?', 'situational', 'hard', 3),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Where do you see the future of HR heading, and how do you plan to grow in this field?', 'behavioral', 'easy', 4);

-- Data Analyst Questions
INSERT OR IGNORE INTO question_templates (id, org_id, role_id, question_text, category, difficulty, order_index) VALUES
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Tell me about your background in data analysis and what tools you are most comfortable with.', 'introduction', 'easy', 0),
  ('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Can you walk me through a project where your data analysis drove a key business decision?', 'behavioral', 'medium', 1),
  ('20000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'How do you approach cleaning and validating a large dataset with inconsistencies?', 'technical', 'medium', 2),
  ('20000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Explain the difference between correlation and causation with a real-world example.', 'technical', 'hard', 3),
  ('20000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'How do you handle stakeholder requests when their data expectations are unrealistic?', 'situational', 'medium', 4);

-- Web Developer Questions
INSERT OR IGNORE INTO question_templates (id, org_id, role_id, question_text, category, difficulty, order_index) VALUES
  ('20000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Tell me about yourself and your experience with web development technologies.', 'introduction', 'easy', 0),
  ('20000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Can you describe a challenging web project you have built and the technologies you used?', 'behavioral', 'medium', 1),
  ('20000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'How do you ensure your web applications are responsive and accessible across different devices?', 'technical', 'medium', 2),
  ('20000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Explain how you would optimize the performance of a slow-loading web application.', 'technical', 'hard', 3),
  ('20000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Where do you see web development heading in the next five years, and how are you preparing for it?', 'behavioral', 'easy', 4);

-- Software Engineer Questions
INSERT OR IGNORE INTO question_templates (id, org_id, role_id, question_text, category, difficulty, order_index) VALUES
  ('20000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'Tell me about your software engineering background and what type of systems you have built.', 'introduction', 'easy', 0),
  ('20000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'Describe a time you had to design a system to handle high traffic or scale. What decisions did you make?', 'situational', 'hard', 1),
  ('20000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'How do you approach debugging a complex production issue that is hard to reproduce?', 'technical', 'medium', 2),
  ('20000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'What is your approach to writing testable and maintainable code?', 'technical', 'medium', 3),
  ('20000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'How do you stay current with new technologies, and how do you decide what to adopt?', 'behavioral', 'easy', 4);

-- Product Manager Questions
INSERT OR IGNORE INTO question_templates (id, org_id, role_id, question_text, category, difficulty, order_index) VALUES
  ('20000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'Tell me about your experience in product management and the types of products you have worked on.', 'introduction', 'easy', 0),
  ('20000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'How do you prioritize features when you have limited engineering resources?', 'situational', 'medium', 1),
  ('20000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'Describe a product launch that did not go as planned. What happened and what did you learn?', 'behavioral', 'hard', 2),
  ('20000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'How do you measure the success of a product after launch?', 'technical', 'medium', 3),
  ('20000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'How do you collaborate with engineering and design teams to deliver a product vision?', 'behavioral', 'medium', 4);

-- UX Designer Questions
INSERT OR IGNORE INTO question_templates (id, org_id, role_id, question_text, category, difficulty, order_index) VALUES
  ('20000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', 'Tell me about your design background and your design process.', 'introduction', 'easy', 0),
  ('20000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', 'Walk me through a project where user research significantly changed the design direction.', 'behavioral', 'medium', 1),
  ('20000000-0000-0000-0000-000000000028', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', 'How do you balance user needs with business goals when they conflict?', 'situational', 'hard', 2),
  ('20000000-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', 'Describe your approach to creating and maintaining a design system.', 'technical', 'medium', 3),
  ('20000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', 'How do you validate your designs and measure the impact of UX improvements?', 'technical', 'medium', 4);
