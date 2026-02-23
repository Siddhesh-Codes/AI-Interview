// ============================================================
// Database Types — mirrors Cloudflare D1 schema
// ============================================================

export type UserRole = 'super_admin' | 'org_admin' | 'interviewer' | 'reviewer';
export type OrgPlan = 'free' | 'pro' | 'enterprise';
export type QuestionCategory = 'behavioral' | 'technical' | 'situational' | 'case_study' | 'introduction';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type SessionStatus = 'invited' | 'in_progress' | 'completed' | 'evaluated' | 'reviewed' | 'archived';
export type AIRecommendation = 'strong_hire' | 'hire' | 'maybe' | 'no_hire' | 'strong_no_hire';
export type ReviewerDecision = 'strong_hire' | 'hire' | 'maybe' | 'no_hire' | 'strong_no_hire';
export type EvalQueueStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type AIProvider = 'groq' | 'gemini' | 'openai';
export type AIAction = 'tts' | 'stt' | 'evaluation';
export type NotifyDigest = 'realtime' | 'daily' | 'weekly' | 'none';

// ---- Organizations ----
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string;
  plan: OrgPlan;
  settings: OrgSettings;
  created_at: string;
}

export interface OrgSettings {
  default_time_limit: number;        // seconds per question (default 120)
  max_questions: number;             // per interview (default 5)
  max_tab_switches: number;          // anti-cheat (default 3)
  enforce_fullscreen: boolean;       // optional fullscreen mode
  tts_voice: string;                 // Edge TTS voice name
  groq_api_key?: string;            // org-level override
  gemini_api_key?: string;          // org-level override
}

// ---- Users ----
export interface User {
  id: string;
  org_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

// ---- Job Roles ----
export interface JobRole {
  id: string;
  org_id: string;
  title: string;
  department: string;
  description: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

// ---- Question Templates ----
export interface QuestionTemplate {
  id: string;
  org_id: string;
  role_id: string;
  question_text: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  rubric: QuestionRubric;
  time_limit_seconds: number;
  order_index: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface QuestionRubric {
  clarity: string;
  relevance: string;
  confidence: string;
  technical_fit: string;
  communication: string;
}

// ---- Candidates ----
export interface Candidate {
  id: string;
  org_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  resume_url: string | null;
  metadata: CandidateMetadata;
  created_at: string;
}

export interface CandidateMetadata {
  source?: string;
  applied_role?: string;
  linkedin?: string;
  notes?: string;
}

// ---- Interview Sessions ----
export interface InterviewSession {
  id: string;
  org_id: string;
  candidate_id: string;
  role_id: string;
  status: SessionStatus;
  invite_token: string;
  invite_expires_at: string;
  started_at: string | null;
  completed_at: string | null;
  total_score: number | null;
  ai_recommendation: AIRecommendation | null;
  ai_summary: string | null;
  reviewer_id: string | null;
  reviewer_notes: string | null;
  reviewer_decision: ReviewerDecision | null;
  reviewed_at: string | null;
  tab_switch_count: number;
  browser_info: Record<string, string>;
  created_by: string;
  created_at: string;
}

// ---- Answers ----
export interface Answer {
  id: string;
  session_id: string;
  question_id: string;
  question_index: number;
  audio_url: string | null;
  audio_duration_seconds: number | null;
  transcript: string | null;
  ai_evaluation: AIEvaluation | null;
  scores: AnswerScores | null;
  average_score: number | null;
  strengths: string[];
  risks: string[];
  ai_recommendation: string | null;
  tab_switches_during: number;
  submitted_at: string | null;
  evaluated_at: string | null;
}

export interface AnswerScores {
  clarity: number;
  relevance: number;
  confidence: number;
  technical_fit: number;
  communication: number;
}

export interface AIEvaluation {
  transcript: string;
  score: AnswerScores;
  scoreJustification: Record<string, string>;
  summary: string;
  strengths: string[];
  risks: string[];
  recommendation: string;
  provider: string;
  model: string;
  latency_ms: number;
}

// ---- Evaluation Queue ----
export interface EvaluationQueueItem {
  id: string;
  answer_id: string;
  status: EvalQueueStatus;
  provider_used: string | null;
  model_used: string | null;
  attempts: number;
  last_error: string | null;
  created_at: string;
  completed_at: string | null;
}

// ---- AI Provider Logs ----
export interface AIProviderLog {
  id: string;
  org_id: string;
  session_id: string | null;
  answer_id: string | null;
  provider: AIProvider;
  model: string;
  action: AIAction;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number;
  cost_estimate_usd: number;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

// ---- Audit Logs ----
export interface AuditLog {
  id: string;
  org_id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ---- Joined / View Types ----
export interface SessionWithDetails extends InterviewSession {
  candidate: Candidate;
  job_role: JobRole;
  answers: Answer[];
  reviewer?: User | null;
}

export interface DashboardStats {
  total_interviews: number;
  completed_interviews: number;
  pending_reviews: number;
  average_score: number;
  completion_rate: number;
  interviews_this_week: number;
  top_recommendation: string;
}
