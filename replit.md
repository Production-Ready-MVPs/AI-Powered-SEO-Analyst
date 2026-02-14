# DevSEO AI

## Overview
DevSEO AI is a SaaS platform that provides AI-powered SEO audits. Users can submit URLs and receive comprehensive SEO analysis powered by OpenAI, with scores across meta tags, content quality, performance, and technical SEO.

## Tech Stack
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui + wouter (routing)
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Replit Auth (OpenID Connect)
- **AI**: OpenAI via Replit AI Integrations (gpt-5-mini for SEO analysis)
- **Build**: Vite

## Architecture
- `client/src/` - React frontend
  - `pages/` - Landing, Dashboard, NewAudit, AuditDetail, AuditsList, Settings
  - `components/` - AppSidebar, ThemeProvider, ThemeToggle, shadcn/ui components
  - `hooks/` - useAuth, useToast, useMobile
- `server/` - Express backend
  - `routes.ts` - API endpoints
  - `storage.ts` - Database operations (IStorage / DatabaseStorage)
  - `seo-analyzer.ts` - Legacy SEO analysis (kept for extractDomain utility)
  - `lib/crawler.ts` - Playwright crawler service (max 20 pages, robots.txt, retry logic)
  - `lib/analyzer.ts` - Rule-based SEO issue detection (8 rules: missing meta/H1/alt, thin content, duplicates, orphans, schema)
  - `lib/aiFixer.ts` - AI-powered fix generation (optimized titles, descriptions, H1s, JSON-LD, internal linking)
  - `lib/queue.ts` - In-memory job queue with progress tracking
  - `lib/worker.ts` - Job worker: crawler → analyzer → AI fixer pipeline (concurrency: 2)
  - `db.ts` - Drizzle + pg pool
  - `replit_integrations/auth/` - Replit Auth module
- `shared/` - Shared types
  - `schema.ts` - Re-exports all models
  - `models/auth.ts` - User/session tables
  - `models/seo.ts` - SEO audits, credit transactions, user profiles
  - `models/chat.ts` - Conversations/messages (from OpenAI integration)

## Key Features
- Multi-tenant: Each user sees only their own audits
- Credit system: Users start with 10 free credits, each audit costs 1
- Role-based: User profiles have role and plan fields
- AI Analysis: OpenAI analyzes URLs for SEO issues and provides scores + recommendations
- Background processing: Audits run asynchronously after creation
- Auto-refresh: Audit detail page polls while pending/processing

## Database Tables
- `users` - Auth users (managed by Replit Auth): id, email, firstName, lastName, profileImageUrl, createdAt, updatedAt
- `sessions` - Session storage: sid, sess (JSONB), expire
- `user_profiles` - User profile data: userId (FK→users, unique), credits, role, plan, subscriptionPlan, stripeCustomerId, totalAudits, createdAt. Indexes: userId, stripeCustomerId
- `seo_audits` - Audit records: userId (FK→users), url, domain, status, overallScore, metaScore, contentScore, performanceScore, technicalScore, pagesCrawled, issuesFound, fixesGenerated, results (JSONB), summary, createdAt, completedAt. Indexes: userId, status, domain, createdAt
- `audit_pages` - Page-level SEO data: auditId (FK→seo_audits, cascade delete), url, title, metaDescription, headings (JSONB), wordCount, internalLinks, externalLinks, images, schemaDetected (JSONB), issues (JSONB), createdAt. Indexes: auditId, url
- `credit_transactions` - Credit history: userId (FK→users), amount, type, description, auditId, createdAt. Indexes: userId, auditId

## API Routes
- `GET /api/profile` - Current user profile (auto-creates with 10 credits)
- `GET /api/audits` - List user's audits
- `GET /api/audits/:id` - Single audit
- `GET /api/audits/:id/pages` - Page-level data for an audit
- `GET /api/audits/:id/progress` - Real-time job progress (stage, message, percent)
- `POST /api/audits` - Create new audit (costs 1 credit, extracts domain)
- `GET /api/credits/history` - Credit transaction history
- `GET /api/auth/user` - Current auth user
- `GET /api/login` - Start login flow
- `GET /api/logout` - Logout

## Running
- `npm run dev` starts both frontend and backend on port 5000
- `npm run db:push` pushes schema to database
