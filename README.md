<div align="center">

# HR AI Interview Platform

AI-powered voice and video interview platform with automated evaluation, anti-cheat detection, and admin dashboard.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?logo=vercel)](https://vercel.com)

[Features](#features) · [Tech Stack](#tech-stack) · [Getting Started](#getting-started) · [Architecture](#architecture) · [API Reference](#api-endpoints) · [Database](#database-schema)

</div>

---

## Table of Contents

- [Features](#features)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Security](#security)
- [Deployment](#deployment)
- [Scripts](#scripts)
- [License](#license)

---

## Features

- **Voice + Video Interviews** — Candidates answer questions via voice recording with continuous video capture
- **AI Text-to-Speech** — Questions read aloud using Edge TTS neural voices with fallback providers
- **AI Evaluation** — Each answer scored on Clarity, Relevance, Confidence, Technical Fit, and Communication (0-100)
- **Multi-Provider AI Fallback** — Groq (primary) with Gemini fallback and graceful degradation
- **Anti-Cheat Detection** — Tab switch and window blur monitoring with configurable violation limits and auto-termination
- **Admin Dashboard** — Interview statistics, score distributions, candidate management, and detailed review
- **Multi-Tenant Architecture** — Organization-scoped data isolation across all tables
- **Role-Based Access Control** — Super admin, org admin, interviewer, and reviewer roles
- **Email Notifications** — Interview invitations and admin emails via Gmail SMTP or Resend
- **Rate Limiting** — Sliding window limiter on login and answer submission endpoints

---

## How It Works

**Admin** creates job roles, adds questions (with scoring rubrics), registers candidates, and sends interview invitations containing a unique token link.

**Candidate** opens the link, completes a camera/microphone check, and answers each question. The system reads questions aloud via TTS, records audio answers and continuous video, then processes each answer through the AI pipeline (transcription followed by evaluation).

**Reviewer** accesses the dashboard to view scores, read transcripts, replay audio/video, and make final hiring decisions.

```
Admin: Setup → Create Roles → Add Questions → Invite Candidates
                                    |
Candidate: Open Link → Mic/Cam Check → Record Answers → AI Processing
                                    |
Reviewer: Dashboard → Review Transcripts & Scores → Decision
```

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16 (App Router) | Framework, SSR, API routes |
| React | 19 | UI library |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 4 | Styling |
| shadcn/ui | Latest | Component library |
| Zustand | 5 | State management |
| TanStack Query | 5 | Server state |
| Framer Motion | Latest | Animations |
| Zod | 4 | Schema validation |

### Backend

| Technology | Purpose |
|---|---|
| Vercel | Hosting, serverless functions, cron jobs |
| Cloudflare D1 | SQLite database (REST API) |
| Cloudflare R2 | S3-compatible object storage (audio/video) |
| Auth.js (NextAuth v5) | Authentication (credentials, JWT sessions) |

### AI Services

| Provider | Usage |
|---|---|
| Groq (Whisper Large v3 Turbo) | Speech-to-text transcription |
| Groq (Llama 3.3 70B / 3.1 8B) | Answer evaluation and scoring |
| Google Gemini (2.0 Flash / 1.5) | Fallback for STT and evaluation |
| Edge TTS | Text-to-speech (Microsoft Neural voices) |

### Email

| Provider | Usage |
|---|---|
| Nodemailer + Gmail SMTP | Primary email delivery |
| Resend | Alternative email provider |

---

## Architecture

```
                          ┌──────────────────────┐
                          │       VERCEL          │
                          │                       │
                          │  Next.js 16 (App Router)
                          │  API Routes (REST)    │
                          │  Auth.js (JWT)        │
                          │  Cron Jobs (Daily)    │
                          └───┬────┬────┬────┬───┘
                              │    │    │    │
                ┌─────────────┘    │    │    └─────────────┐
                │                  │    │                   │
         ┌──────▼──────┐  ┌──────▼──────┐  ┌─────────────▼──┐
         │ Cloudflare D1│  │ Cloudflare R2│  │  AI Services    │
         │ (Database)   │  │ (Storage)    │  │  Groq / Gemini  │
         │ 15 tables    │  │ Audio/Video  │  │  Edge TTS       │
         └─────────────┘  └─────────────┘  └────────────────┘
```

**Answer submission flow:** Browser records audio and sends to API. The API uploads audio to R2, transcribes via Groq Whisper (Gemini fallback), evaluates the transcript via Llama 3.3 (Gemini fallback), stores scores in D1, and returns results.

---

## Prerequisites

| Requirement | Details |
|---|---|
| Node.js | v18 or higher |
| pnpm | Package manager |
| Cloudflare account | For D1 database and R2 storage |
| Groq API key | [console.groq.com](https://console.groq.com) |
| Gemini API key | [aistudio.google.com](https://aistudio.google.com) |
| Gmail App Password | For SMTP email (or Resend API key as alternative) |
| Vercel account | For deployment |

---

## Environment Variables

Create `.env.local` in the project root:

```env
# Cloudflare D1
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_D1_DATABASE_ID=
CLOUDFLARE_D1_API_TOKEN=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=hr-interviews
R2_PUBLIC_URL=

# Auth
AUTH_SECRET=       # generate with: openssl rand -base64 32
AUTH_URL=http://localhost:3000

# AI
GROQ_API_KEY=
GEMINI_API_KEY=

# Email (pick one or both)
SMTP_USER=
SMTP_PASS=
RESEND_API_KEY=
EMAIL_FROM=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=HR AI Interview
```

---

## Getting Started

```bash
# 1. Clone and install
git clone https://github.com/your-username/hr-ai-interview.git
cd hr-ai-interview/platform
pnpm install

# 2. Set up Cloudflare D1
wrangler login
wrangler d1 create hr-interviews
wrangler d1 execute hr-interviews --file=scripts/d1-schema.sql

# 3. Set up Cloudflare R2
wrangler r2 bucket create hr-interviews
node scripts/setup-r2-cors.mjs    # optional, for direct browser uploads

# 4. Configure environment
cp .env.example .env.local         # fill in your keys

# 5. Start dev server
pnpm dev

# 6. Visit http://localhost:3000/setup to create your admin account
```

The setup wizard creates a demo organization pre-loaded with 6 job roles and 30 sample questions.

---

## Project Structure

```
src/
├── app/
│   ├── setup/                     # First-time admin setup
│   ├── admin/login/               # Admin login
│   ├── interview/[token]/         # Candidate interview page
│   ├── [orgSlug]/                 # Admin dashboard (protected)
│   │   ├── interviews/            # Interview management
│   │   ├── candidates/            # Candidate management
│   │   ├── job-roles/             # Role definitions
│   │   ├── questions/             # Question bank
│   │   ├── team/                  # Team management
│   │   ├── settings/              # Org settings
│   │   └── audit/                 # Audit logs
│   └── api/v1/                    # REST API endpoints
├── components/
│   ├── interview/                 # Interview engine (camera, mic, recording, TTS)
│   ├── admin/                     # Admin shell and sidebar
│   └── ui/                        # shadcn/ui components
├── hooks/
│   ├── use-anti-cheat.ts          # Tab/window switch detection
│   ├── use-audio-recorder.ts      # MediaRecorder wrapper
│   └── use-interview-timer.ts     # Per-question timer
├── lib/
│   ├── ai/                        # Groq, Gemini, Edge TTS, fallback chain
│   ├── auth/                      # Auth.js config + server helpers
│   ├── db/d1.ts                   # Cloudflare D1 REST client
│   ├── storage/r2.ts              # R2 S3-compatible client
│   ├── email.ts                   # Gmail SMTP service
│   ├── email/resend.ts            # Resend provider
│   └── rate-limit.ts              # Sliding window rate limiter
├── stores/
│   ├── admin-store.ts             # Admin UI state (persisted)
│   └── interview-store.ts         # Interview phase state (ephemeral)
└── types/
    ├── database.ts                # DB table interfaces
    └── schemas.ts                 # Zod validation schemas
```

---

## API Endpoints

### Public

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/setup` | First-time setup |
| GET | `/api/v1/interview/[token]` | Get interview data |
| POST | `/api/v1/interview/[token]` | Start/complete interview |
| POST | `/api/v1/answers` | Submit answer (triggers AI pipeline) |
| POST | `/api/v1/tts` | Generate TTS audio |
| GET | `/api/v1/upload-url` | Presigned R2 upload URL |
| POST | `/api/v1/interview-video` | Register video upload |

### Protected (requires auth)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/dashboard` | Statistics and score distribution |
| GET/POST | `/api/v1/interviews` | List / create interviews |
| GET/PATCH | `/api/v1/interviews/[id]` | Details / review decision |
| GET/POST | `/api/v1/candidates` | List / create candidates |
| GET/POST/PUT | `/api/v1/job-roles` | CRUD job roles |
| GET/POST/PUT/DELETE | `/api/v1/questions` | CRUD questions |
| GET | `/api/v1/media` | Proxy audio/video |
| POST | `/api/v1/cleanup-videos` | Cron: cleanup expired videos |

---

## Database Schema

15 tables on Cloudflare D1 (SQLite) with organization-scoped isolation:

| Table | Purpose |
|---|---|
| `organizations` | Tenant orgs with settings and branding |
| `users` | Admin/reviewer accounts with roles |
| `auth_sessions` | Auth.js sessions |
| `verification_tokens` | Magic link tokens |
| `job_roles` | Position definitions by department |
| `question_templates` | Questions with rubric, category, difficulty, time limit |
| `candidates` | Applicant profiles |
| `interview_sessions` | Interview instances with status, scores, video URL |
| `answers` | Per-question audio, transcript, AI evaluation, dimension scores |
| `evaluation_queue` | Async evaluation tracking |
| `ai_provider_logs` | AI usage metrics |
| `audit_logs` | Admin action trail |
| `notification_preferences` | Email notification settings |
| `org_invitations` | Team invitations |
| `system_config` | Feature flags |

---

## Security

| Measure | Details |
|---|---|
| CSRF protection | Origin/Referer header validation on mutation requests |
| Route guards | Session cookie check on all admin routes |
| Password hashing | bcryptjs |
| JWT sessions | 24h expiry, re-validated per request |
| Rate limiting | 5 login/min per email, 20 submissions/min per IP |
| Input validation | Zod v4 schemas on all API inputs |
| Tenant isolation | All queries scoped by `org_id` |
| Signed URLs | Time-limited access to stored media |

---

## Deployment

1. Push to GitHub
2. Import on [vercel.com/new](https://vercel.com/new)
3. Add all environment variables
4. Deploy (auto-detects Next.js)
5. Visit `/setup` to create admin account

A daily cron job (`0 3 * * *`) runs at 3 AM UTC to clean up expired interview videos.

### Post-Deployment Checklist

- [ ] D1 database created and schema applied
- [ ] R2 bucket created
- [ ] Environment variables configured
- [ ] Admin account created via `/setup`
- [ ] Email delivery verified
- [ ] End-to-end interview flow tested

---

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm start` | Production server |
| `pnpm lint` | Lint check |

| Script | Description |
|---|---|
| `scripts/d1-schema.sql` | Database schema + seed data |
| `scripts/add_video_columns.sql` | Video columns migration |
| `scripts/migrate-d1-video.js` | Video migration runner |
| `scripts/setup-r2-cors.mjs` | R2 CORS configuration |

---

## License

MIT

---

<div align="center">

Built with Next.js 16 and React 19.

</div>

