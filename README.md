# PulseAI — India-First News Intelligence Platform 🇮🇳

![Status](https://img.shields.io/badge/status-active-success)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)

PulseAI is an India-first, AI-powered personalized news intelligence platform. It aggregates live news from multiple providers, applies deterministic personalization, generates executive AI summaries, clusters related coverage, and surfaces multi-perspective news analysis.

---

## Table of Contents

- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Repository Structure](#-repository-structure)
- [Local Development Setup](#-local-development-setup)
- [Supabase Database Setup](#-supabase-database-setup)
- [Environment Variables](#-environment-variables)
- [Testing & Verification](#-testing--verification)
- [Deploying to Vercel](#-deploying-to-vercel)
- [Health Check API](#-health-check-api)
- [Security Notes](#-security-notes)
- [License](#license)

---

## 🌟 Key Features

- 🇮🇳 **India-First Geographic Intelligence**: Filter coverage across **India**, **World**, or **All** feeds with automatic priority ranking for Indian national developments, technology, startup ecosystems, and public policy.
- 👤 **Controlled Guest Reading Experience**: Unauthenticated users can browse news and read articles up to daily limits (`10` articles, `5` searches, `3` AI summaries per day). Limits are enforced on both server-side API middleware and client-side context.
- 🎯 **Deterministic Personalization**: User interest scoring ranks feed content dynamically based on category preferences, topic interaction decay, and freshness signals without hiding non-preferred topics.
- 🔥 **Real-Time Trending Engine**: Dedicated trending feed identifying breaking developments and high-velocity news clusters independently from personalization filters.
- 🛡️ **Provider Resiliency & Cooldown Engine**: Multi-tier provider fallback system (**GNews** → **NewsAPI** → **Curated RSS / India News Engine**) with automatic 15-minute backoff on rate limits (`HTTP 429` / `403`), avoiding infinite retry loops or outages.
- 🤖 **Executive AI Summaries**: Powered by the Google Gemini API (`@google/genai`) to generate instant TL;DR summaries, key takeaways, sentiment indicators, and entity extraction.
- ⚖️ **Multi-Perspective Coverage Comparison**: Compare headlines and reporting angles from multiple independent news sources side by side.
- 🌐 **Multilingual Translation**: AI-driven full article translation and UI localization for Hindi, Tamil, Telugu, Bengali, Marathi, and English.
- 🔖 **Bookmarks & Saved Articles**: Persistent reading lists backed by PostgreSQL / Supabase, with offline client caching fallback.
- 🌓 **Adaptive Light/Dark Theme**: High-contrast, WCAG AA compliant visual design with automatic system preference detection and persistent user selection.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, Lucide React, Motion |
| Backend | Node.js, Express, TypeScript (`tsx` / `esbuild`) |
| AI Engine | Google Gemini API (`@google/genai`) |
| Database | PostgreSQL / Supabase (`pg` client), with file-backed dev store fallback (`.data_store.json`) |
| Auth | JWT & bcryptjs |
| News Providers | GNews API, NewsAPI, curated Indian/global RSS feeds |

---

## 📂 Repository Structure

```
├── api/          # Vercel serverless function entry point (api/index.ts)
├── server/       # Unified Express API server
│   ├── app.ts        # Express application & route wiring
│   ├── config.ts      # Centralized environment configuration
│   ├── db/         # PostgreSQL database pool & local dev store fallback
│   ├── middleware/    # JWT auth & guest limit enforcement middleware
│   ├── providers/    # News provider wrappers (GNews, NewsAPI, RSS) & fallback engine
│   ├── routes/      # REST API endpoints (/auth, /users, /news, /bookmarks, /summaries)
│   └── services/     # Auth, Gemini AI, and guest tracking services
├── src/          # React 19 + Vite frontend
│   ├── api/         # Client-side API client with x-guest-id tracking
│   ├── components/    # UI components (auth, common, news, profile)
│   ├── context/      # React context providers (Auth, Guest, Language, Theme, Bookmark)
│   └── pages/       # App views (LandingPage, HomePage, BookmarksPage)
├── supabase/       # Production database scripts
│   ├── schema.sql     # Production Supabase SQL DDL schema
│   ├── seed.sql      # Development seed data
│   └── migrations/    # Version-controlled migrations
├── scripts/        # Development helper scripts (e.g. seed-test-user.ts)
├── tests/         # Automated TAP unit tests
├── vercel.json      # Vercel deployment configuration
└── .env.example      # Environment variable template
```

---

## 🚀 Local Development Setup

### 1. Installation
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Configure your credentials in `.env`:
```env
GEMINI_API_KEY="your-gemini-api-key"
JWT_SECRET="your-secure-random-jwt-secret"
DATABASE_URL="" # Optional for local dev - falls back to .data_store.json if omitted
```

### 3. Seed Local Demo User
Populate the development store with a test account:
```bash
npm run seed:demo
```
This creates a demo account — check `scripts/seed-test-user.ts` for the generated credentials.

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Supabase Database Setup

To configure persistent PostgreSQL storage on Supabase:

1. Sign in to [Supabase](https://supabase.com) and create a new project.
2. In the Supabase Dashboard, open **SQL Editor → New Query**.
3. Open `supabase/schema.sql` from this repository, copy its entire contents, paste into the SQL Editor, and click **Run**.
4. Navigate to **Project Settings → Database** and copy the **Transaction Pooler** connection string:
   ```
   postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
5. Set `DATABASE_URL` in your `.env` or production deployment environment variables.

---

## ⚙️ Environment Variables

| Variable | Description | Server / Client | Required |
|---|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key for AI summaries & translation | Server-side | Optional (AI features require it) |
| `JWT_SECRET` | Secret key for signing authentication tokens | Server-side | Required |
| `DATABASE_URL` | PostgreSQL connection string (Supabase) | Server-side | Required in production |
| `NEWS_API_KEY` | NewsAPI key for multi-source provider aggregation | Server-side | Optional (falls back to RSS) |
| `GNEWS_API_KEY` | GNews API key for headline aggregation | Server-side | Optional (falls back to RSS) |
| `GUEST_ARTICLE_LIMIT` | Max free article reads per guest per day (default: `10`) | Server-side | Optional |
| `GUEST_SEARCH_LIMIT` | Max search requests per guest per day (default: `5`) | Server-side | Optional |
| `GUEST_AI_LIMIT` | Max AI summaries/translations per guest per day (default: `3`) | Server-side | Optional |
| `NODE_ENV` | Environment mode (`development` or `production`) | Server-side | Required |
| `PORT` | Web server port (default: `3000`) | Server-side | Required |
| `FRONTEND_ORIGIN` | CORS allowed origins, e.g. `https://your-app.vercel.app` | Server-side | Optional |
| `VITE_API_BASE_URL` | API base URL override for split client/server setups | Client-side | Optional |

---

## 🧪 Testing & Verification

Run automated TAP unit tests:
```bash
npm test
```

Run TypeScript strict type checking / linting:
```bash
npm run lint
```

Run a production build:
```bash
npm run build
```

---

## 🌐 Deploying to Vercel

### 1. Push Code to GitHub
```bash
git init
git add .
git commit -m "feat: initial release"
git branch -M main
git remote add origin https://github.com/Himanshu0730/pulseai-news-intelligence.git
git push -u origin main
```

### 2. Connect Repository on Vercel
1. Log in to [Vercel](https://vercel.com) and click **Add New → Project**.
2. Import the `pulseai-news-intelligence` GitHub repository.
3. Vercel automatically detects the `vercel.json` configuration.
4. Set environment variables in Project Settings:
   - `GEMINI_API_KEY`
   - `JWT_SECRET`
   - `DATABASE_URL`
   - `NODE_ENV` = `production`
5. Click **Deploy**.

---

## ⚡ Health Check API

Verify backend health at:
- `GET /api/health`
- `GET /api/v1/health`

---

## 🔐 Security Notes

- **API Secrets**: All API keys (`GEMINI_API_KEY`, `NEWS_API_KEY`, `GNEWS_API_KEY`, `DATABASE_URL`) are kept strictly server-side and never exposed to the browser.
<<<<<<< HEAD
- **Git Hygiene**: `.env` and `.data_store.json` files are excluded via `.gitignore`.
=======
- **Git Hygiene**: `.env` and `.data_store.json` are excluded via `.gitignore`.

---

## License

This project is licensed under the MIT License. Add a `LICENSE` file to the repository root to make this official.
>>>>>>> 46019f4 (fixing some bugs)
