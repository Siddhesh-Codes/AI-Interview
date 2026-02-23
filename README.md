# AI Interview Platform

AI-powered voice interview platform with automated evaluation, anti-cheat detection, and a full admin dashboard.

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| [Next.js](https://nextjs.org) | 16 (App Router) | React framework, SSR, API routes |
| [React](https://react.dev) | 19 | UI library |
| [TypeScript](https://typescriptlang.org) | 5.x | Type safety |
| [Tailwind CSS](https://tailwindcss.com) | 4 | Utility-first styling |
| [shadcn/ui](https://ui.shadcn.com) | Latest | Pre-built accessible components |
| [Framer Motion](https://motion.dev) | Latest | Animations |
| [Lucide Icons](https://lucide.dev) | Latest | Icon library |
| [Sonner](https://sonner.emilkowal.dev) | Latest | Toast notifications |
| [Zod](https://zod.dev) | 4 | Schema validation |

### Backend & Infrastructure
| Technology | Purpose | Cost |
|---|---|---|
| [Vercel](https://vercel.com) | Hosting & serverless functions | **Free** (100GB bandwidth/mo) |
| [Cloudflare D1](https://developers.cloudflare.com/d1/) | SQLite database (via REST API) | **Free** (5GB, 5M reads/day) |
| [Cloudflare R2](https://developers.cloudflare.com/r2/) | Object storage for audio files | **Free** (10GB, 0 egress fees) |
| [Auth.js (NextAuth v5)](https://authjs.dev) | Authentication (password + magic link) | **Free** (open source) |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | Password hashing | **Free** |

### AI Services
| Technology | Purpose | Cost |
|---|---|---|
| [Groq](https://groq.com) (Whisper Large v3 Turbo) | Speech-to-Text transcription | **Free** (14.4K req/day) |
| [Groq](https://groq.com) (Llama 3.3 70B) | Answer evaluation & scoring | **Free** (30 RPM) |
| [Google Gemini](https://ai.google.dev) | AI fallback (STT + evaluation) | **Free** (15 RPM) |
| [Edge TTS](https://github.com/nickshouse/edge-tts) | Text-to-Speech for questions | **Free** |

### Email
| Technology | Purpose | Cost |
|---|---|---|
| [Resend](https://resend.com) | Interview invites + magic link emails | **Free** (3,000 emails/mo) |

### **Total monthly cost: $0**

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                     VERCEL                            │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐ │
│  │  Next.js     │  │  API Routes │  │  Auth.js     │ │
│  │  Frontend    │  │  (Node.js)  │  │  Sessions    │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘ │
└─────────┼────────────────┼─────────────────┼─────────┘
          │                │                 │
    ┌─────▼─────┐   ┌─────▼─────┐   ┌──────▼──────┐
    │ Cloudflare │   │ Cloudflare │   │  Groq /     │
    │    D1      │   │    R2      │   │  Gemini AI  │
    │ (Database) │   │ (Storage)  │   │  (Eval/STT) │
    └───────────┘   └───────────┘   └─────────────┘
```

---

## Features

- **AI Voice Interviews** — Candidates answer questions via voice, recorded and transcribed
- **AI Evaluation** — Groq Llama 3.3 scores answers on clarity, relevance, confidence, technical fit, communication (0-100%)
- **Anti-Cheat** — Tab-switch detection with auto-termination
- **Webcam Preview** — Live camera feed during interviews
- **Admin Dashboard** — Statistics, interview management, candidate tracking
- **Multi-Tenant** — Organization-scoped data isolation
- **Magic Link Login** — Passwordless admin authentication via email
- **Audio Playback** — Admins can replay candidate recordings with signed URLs

---

## Prerequisites

Before setting up, you need free accounts on these services:

| Service | Sign Up | What You Need |
|---|---|---|
| **Node.js** | [nodejs.org](https://nodejs.org) | v18+ installed locally |
| **Vercel** | [vercel.com](https://vercel.com) | For deployment (GitHub login works) |
| **Cloudflare** | [dash.cloudflare.com](https://dash.cloudflare.com) | Account ID, API Token, R2 keys |
| **Groq** | [console.groq.com](https://console.groq.com) | API Key |
| **Google AI Studio** | [aistudio.google.com](https://aistudio.google.com) | Gemini API Key |
| **Resend** *(optional)* | [resend.com](https://resend.com) | API Key (for emails) |

---

## Environment Variables

Create a `.env.local` file in the project root:

```env
# ── Cloudflare D1 (Database) ──
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_D1_DATABASE_ID=your_d1_database_id
CLOUDFLARE_D1_API_TOKEN=your_api_token

# ── Cloudflare R2 (Storage) ──
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=hr-interviews
R2_PUBLIC_URL=https://your-bucket.r2.dev

# ── Auth.js ──
AUTH_SECRET=generate_a_random_32_char_string
AUTH_URL=http://localhost:3000

# ── AI Providers ──
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key

# ── Email (Optional) ──
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=interviews@yourdomain.com

# ── App ──
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=HR AI Interview
```

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up Cloudflare D1 database
npx wrangler d1 create hr-interviews
npx wrangler d1 execute hr-interviews --file=scripts/d1-schema.sql

# 3. Create R2 bucket
npx wrangler r2 bucket create hr-interviews

# 4. Configure environment variables
# Copy .env.example to .env.local and fill in your keys

# 5. Run development server
npm run dev

# 6. First-time setup
# Visit http://localhost:3000/setup to create your admin account
```

---

## Project Structure

```
platform/
├── scripts/
│   └── d1-schema.sql          # D1 (SQLite) database schema + seed data
├── src/
│   ├── app/
│   │   ├── admin/login/       # Admin login (password + magic link)
│   │   ├── auth/callback/     # Auth.js callback handler
│   │   ├── interview/[token]/ # Candidate interview page
│   │   ├── setup/             # First-time admin setup
│   │   ├── [orgSlug]/         # Admin dashboard pages
│   │   │   ├── interviews/    # Interview management
│   │   │   ├── candidates/    # Candidate management
│   │   │   ├── job-roles/     # Job role management
│   │   │   └── questions/     # Question bank
│   │   └── api/v1/            # REST API endpoints
│   ├── components/
│   │   ├── interview/         # Interview engine + UI
│   │   ├── admin/             # Admin layout + sidebar
│   │   └── ui/                # shadcn/ui components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/
│   │   ├── auth/              # Auth.js configuration
│   │   ├── db/                # D1 database client
│   │   ├── storage/           # R2 storage client
│   │   ├── ai/                # AI providers (Groq, Gemini, fallback)
│   │   └── email/             # Resend email service
│   └── types/                 # TypeScript types + Zod schemas
├── .env.local                 # Environment variables
├── package.json
└── README.md
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/v1/interviews` | List / create interview sessions |
| `GET/PATCH` | `/api/v1/interviews/[id]` | Get details / submit review |
| `GET/POST` | `/api/v1/interview/[token]` | Get interview data / start interview |
| `POST` | `/api/v1/answers` | Submit candidate answer (audio) |
| `GET/POST` | `/api/v1/candidates` | List / create candidates |
| `GET/POST/PUT` | `/api/v1/job-roles` | CRUD job roles |
| `GET/POST/PUT/DELETE` | `/api/v1/questions` | CRUD question templates |
| `GET` | `/api/v1/dashboard` | Dashboard statistics |
| `POST` | `/api/v1/tts` | Text-to-speech generation |
| `POST` | `/api/setup` | First-time admin setup |

---

## Database Schema (D1 / SQLite)

13 tables with organization-scoped data isolation:

| Table | Purpose |
|---|---|
| `organizations` | Multi-tenant orgs |
| `users` | Admin/reviewer accounts |
| `job_roles` | Interview role definitions |
| `question_templates` | Question bank per role |
| `candidates` | Candidate profiles |
| `interview_sessions` | Interview instances |
| `answers` | Recorded answers + AI scores |
| `evaluation_queue` | Async evaluation tracking |
| `ai_provider_logs` | AI usage logging |
| `audit_logs` | Action audit trail |
| `notification_preferences` | User notification settings |
| `org_invitations` | Team member invites |
| `system_config` | Feature flags |

---

