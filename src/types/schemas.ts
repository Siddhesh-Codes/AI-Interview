import { z } from 'zod/v4';

// UUID regex that accepts both RFC-4122 and non-standard variant UUIDs (e.g. seeded data)
const uuidLike = z.string().regex(
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  'Invalid UUID format',
);

// ---- Auth ----
export const loginSchema = z.object({
  email: z.email('Please enter a valid email address'),
});

// ---- Organization ----
export const orgSettingsSchema = z.object({
  default_time_limit: z.number().min(30).max(600).default(120),
  max_questions: z.number().min(1).max(20).default(5),
  max_tab_switches: z.number().min(1).max(10).default(3),
  enforce_fullscreen: z.boolean().default(false),
  tts_voice: z.string().default('en-US-GuyNeural'),
});

export const createOrgSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
});

// ---- Job Role ----
export const createJobRoleSchema = z.object({
  title: z.string().min(2).max(100),
  department: z.string().min(1).max(100),
  description: z.string().max(1000).default(''),
});

// ---- Question Template ----
export const questionRubricSchema = z.object({
  clarity: z.string().default('How well-structured and articulate is the response?'),
  relevance: z.string().default('Does the answer directly address the question?'),
  confidence: z.string().default('How confident does the candidate sound?'),
  technical_fit: z.string().default('Does the answer demonstrate relevant skills?'),
  communication: z.string().default('How effective is the candidate\'s communication?'),
});

export const createQuestionSchema = z.object({
  role_id: uuidLike,
  question_text: z.string().min(10).max(500),
  category: z.enum(['behavioral', 'technical', 'situational', 'case_study', 'introduction']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  rubric: questionRubricSchema.optional(),
  time_limit_seconds: z.number().min(30).max(600).default(120),
  order_index: z.number().min(0).default(0),
});

// ---- Candidate ----
export const createCandidateSchema = z.object({
  email: z.email(),
  full_name: z.string().min(2).max(100),
  phone: z.string().max(20).optional(),
  metadata: z.object({
    source: z.string().optional(),
    applied_role: z.string().optional(),
    linkedin: z.string().url().optional(),
    notes: z.string().optional(),
  }).optional(),
});

// ---- Interview Session ----
export const createSessionSchema = z.object({
  candidate_id: uuidLike,
  role_id: uuidLike,
  invite_expires_at: z.string().datetime().optional(),
  question_ids: z.array(uuidLike).min(1).max(20).optional(),
});

// ---- Answer Upload ----
export const uploadAnswerSchema = z.object({
  session_id: uuidLike,
  question_id: uuidLike,
  question_index: z.number().min(0),
  audio_base64: z.string().min(100),
  audio_duration_seconds: z.number().min(0).optional(),
  tab_switches_during: z.number().min(0).default(0),
});

// ---- Review ----
export const reviewSessionSchema = z.object({
  reviewer_notes: z.string().max(2000).optional(),
  reviewer_decision: z.enum(['strong_hire', 'hire', 'maybe', 'no_hire', 'strong_no_hire']),
});

// ---- TTS ----
export const ttsRequestSchema = z.object({
  text: z.string().min(1).max(1000),
  voice: z.string().default('en-US-GuyNeural'),
});

// ---- Candidate Interview Start ----
export const startInterviewSchema = z.object({
  token: z.string().min(20).max(100),
  candidate_name: z.string().min(1).max(100),
  candidate_email: z.email(),
  browser_info: z.record(z.string(), z.string()).optional(),
});

// Type inference helpers
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateOrgInput = z.infer<typeof createOrgSchema>;
export type CreateJobRoleInput = z.infer<typeof createJobRoleSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UploadAnswerInput = z.infer<typeof uploadAnswerSchema>;
export type ReviewSessionInput = z.infer<typeof reviewSessionSchema>;
export type TTSRequestInput = z.infer<typeof ttsRequestSchema>;
export type StartInterviewInput = z.infer<typeof startInterviewSchema>;
