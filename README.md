# Daily Recap

A personal life tracker that turns small daily logs into a **recap** of your day, week and month —
and finds patterns across them (“you spend 188% more on low-mood days”).

Bilingual (🇮🇩 Bahasa Indonesia / 🇬🇧 English), installable as a PWA, with an evening push reminder.

## Features

| | |
|---|---|
| **Recap** | Daily view (reflection, habits, tasks and money for any date), weekly and monthly views with highlights and comparison to the previous period, optional AI summary |
| **Insights** | Cross-module rules: mood vs spending, habits vs mood, sleep vs mood, sleep vs tasks, most productive weekday, biggest spending day, weekend mood — each needs enough data on both sides before it says anything |
| **AI (optional)** | *Tell me about your day*: free text → reviewed entries (structured output); **AI Assistant** that answers questions from your data with read-only tools (agent + streaming chat); **weekly coach** with one-click priorities; recap summaries. Off unless `GOOGLE_GENERATIVE_AI_API_KEY` is set, and each user can turn it off |
| **Quick add (Ctrl+K)** | `-25rb kopi` · `+5jt gaji` · `-1,5jt sewa kemarin` · `todo beli sayur besok` · `done olahraga` · `mood baik capek tapi senang` · `tidur 23:30 06:15` · `wish 350rb sepatu` · `prioritas laporan Q3` |
| **Finance** | Transactions, monthly budgets, savings goals, recurring transactions (rent, subscriptions) |
| **To-Do** | Today / upcoming / completed, due dates, priority, overdue |
| **Habits** | 7-day check grid, current and best streak, 30-day completion rate, archive |
| **Journal** | One entry per day: mood, reflection, gratitude, tags; mood calendar |
| **Sleep** | Bed/wake times (time-zone and DST safe), quality, duration chart, bedtime consistency; feeds the mood/productivity insights |
| **Weekly plan** | Pick up to 3 (max 5) priorities per week, check them off, reviewed in the weekly recap; plan next week from the recap |
| **Wishlist "wait 7 days"** | Park non-urgent purchases for a few days; buy (recorded as an expense) or skip (counted as money saved) |
| **PWA** | Installable, offline fallback page, web-push evening reminder when today's recap is empty |
| **Your data** | Export everything as JSON or transactions as CSV; delete the account and all data |

## Tech

Next.js 16 (App Router, `proxy.ts`) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui on Base UI ·
Prisma 5 · Auth.js v5 (credentials + JWT) · next-intl · Recharts · react-hook-form + zod · Vitest · web-push ·
AI SDK 7 (`ai`, `@ai-sdk/react`) via the Vercel AI Gateway

## Getting started

Requires Node.js 22+ (the AI SDK needs it).

```bash
npm install
cp .env.example .env          # then fill in the values (see below)
npx auth secret               # writes AUTH_SECRET to .env.local — or paste your own
docker compose up -d db       # Postgres 15 on localhost:5433 (see docker-compose.yml)
npx prisma db push            # creates the schema in that database
npx prisma db seed            # 90 days of demo data
npm run dev
```

Sign in with **demo@dailyrecap.com / demo1234**. The seed is deterministic and only resets the demo user.

The schema is Postgres-only, so local development uses the Postgres from `docker-compose.yml`
rather than SQLite. `.env` already points at it:
`postgresql://root:password@localhost:5433/daily_recap`.

One trap if you also use the Vercel CLI: `vercel env pull` writes the **production** Neon
`DATABASE_URL` into `.env.local`, and Next.js loads `.env.local` with a higher priority than
`.env` - so `npm run dev` would then read and write the production database. Keep the local
URL in `.env.development.local`, which wins over `.env.local` in development and is not
overwritten by the next pull:

```bash
# .env.development.local
DATABASE_URL="postgresql://root:password@localhost:5433/daily_recap"
```

Prisma's CLI (`prisma db push`, `prisma db seed`) reads only `.env`, so keep both files
pointing at the same database.

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres URL; `postgresql://root:password@localhost:5433/daily_recap` for the Docker Compose database locally |
| `AUTH_SECRET` | yes | `npx auth secret` |
| `AUTH_TRUST_HOST` | self-hosting | `true` when running `next start` yourself; not needed on Vercel |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | for reminders | `npx web-push generate-vapid-keys`; subject is `mailto:you@…` |
| `CRON_SECRET` | for reminders | Random string; Vercel Cron sends it as a Bearer token |
| `GOOGLE_GENERATIVE_AI_API_KEY` | optional | Enables the AI features (Google Gemini); get a key at https://aistudio.google.com/apikey |
| `AI_FAST_MODEL` / `AI_SMART_MODEL` | optional | Gemini model ids; both default to `gemini-flash-lite-latest` |

### Scripts

```bash
npm run dev         # dev server
npm run build       # production build
npm test            # Vitest (date logic, finance, habits, insights, recap, quick-add parser, CSV…)
npm run typecheck   # next typegen + tsc
npm run lint
node scripts/generate-icons.mjs   # re-render PWA icons from public/icons/icon.svg
```

## How it works

### Dates and time zones
A calendar date (transaction date, habit day, journal day, due date) is stored as **UTC midnight of
that date in the user's time zone** and travels over the API as `YYYY-MM-DD`. “Today” is always
computed from `User.timezone`, never from the server clock. Real moments (`createdAt`, `completedAt`)
stay as instants and are bucketed into days with `dayBoundsInTz`. See `src/lib/date.ts`.

### Project layout
```
src/lib/            pure logic + tests: date, finance, habits, insights, recap, quick-add, recurring, csv
src/lib/*-server.ts database-backed helpers (recap rows, recurring materialisation)
src/app/api/        route handlers — each checks the session and scopes every query by userId
src/components/     feature components (finance, todos, habits, journal, recap, quick-add, settings)
messages/           id.json / en.json translations
prisma/             schema + deterministic demo seed
```

### Recurring transactions
Rules are materialised lazily: whenever finance data is read, every occurrence due up to today is
created. A rule is claimed by moving `nextDate` forward only if it still has the value that was read,
so concurrent requests can't create duplicates. Monthly rules keep their day of month (31st → 30 Apr
→ 28 Feb → 31 May).

### AI
All AI code is in `src/lib/ai/` and runs on the server. The assistant is a `ToolLoopAgent` built **per request**,
so every tool is bound to the signed-in user and only reads data — the model never chooses whose data it sees.
Free-text logging asks for structured output, then `toQuickAdds` re-validates every entry against the app's
rules; nothing is saved until the user confirms. Chat history lives only in the browser. Each feature is rate
limited, and users can turn AI off in Settings.

### Security
Credentials login with bcrypt, per-email and per-IP rate limiting, constant-time miss for unknown
emails, zod validation on every write, ownership checks on every record, security headers, CSV
formula-injection guard. The rate limiter is in-memory (per instance) — use a shared store such as
Upstash Redis if you run several instances.

## Deploying to Vercel (Postgres)

SQLite can't be used on Vercel's serverless filesystem, so production needs Postgres
(e.g. Neon or Supabase from the Vercel Marketplace).

1. In `prisma/schema.prisma` change the datasource to
   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")
     directUrl = env("DATABASE_URL_UNPOOLED") // Neon; omit if your provider has no separate URL
   }
   ```
2. Create the schema once: `DATABASE_URL=… npx prisma db push` (or start using `prisma migrate` from here on).
3. Optionally seed the demo account: `DATABASE_URL=… npx prisma db seed`.
4. Import the repo in Vercel and set the environment variables above
   (`AUTH_TRUST_HOST` is not needed there). `vercel.json` runs `prisma generate` before the build.
   **Schema changes are not deployed by this.** `prisma generate` only rebuilds the client from
   `prisma/schema.prisma`; it never touches the database. So anything you change in the schema -
   a new `@@index`, a column, a model - has to be applied yourself, once, against production:
   ```bash
   DATABASE_URL="$DATABASE_URL_UNPOOLED" npx prisma db push
   ```
   Use the **unpooled** URL: Neon's pooler is not meant for DDL. Check what a push would do first
   with `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma
   --to-schema-datamodel prisma/schema.prisma --script`, which prints the SQL without running it.
5. **Cron:** `vercel.json` schedules `/api/cron/reminders` daily at 13:00 UTC (20:00 WIB) because the
   Hobby plan only allows daily crons. On Pro, change it to `0 * * * *` so each user's own reminder
   hour is honoured.
6. **Demo data:** `npx tsx scripts/backfill-demo-exercises.ts` fills the demo account's existing
   workout sessions with exercises and sets, so Personal Records has history to show. It prints a
   dry run by default and writes only with `--apply`; unlike `prisma db seed` it never deletes or
   resets anything, and it skips sessions that already have exercises.

## Roadmap ideas
Modules that exist in the schema but are hidden until finished (flip `ready` in
`src/components/layout/Sidebar.tsx`): workout, water, body metrics, meditation, goals,
pomodoro, books, skills, TIL.
