# Daily Recap

A personal life tracker that turns small daily logs into a **recap** of your day, week and month —
and finds patterns across them (“you spend 188% more on low-mood days”).

Bilingual (🇮🇩 Bahasa Indonesia / 🇬🇧 English), installable as a PWA, with an evening push reminder.

## Features

| | |
|---|---|
| **Recap** | Daily view (reflection, habits, tasks and money for any date), weekly and monthly views with highlights and comparison to the previous period, optional AI summary |
| **Insights** | Cross-module rules: mood vs spending, habits vs mood, sleep vs mood, sleep vs tasks, most productive weekday, biggest spending day, weekend mood — each needs enough data on both sides before it says anything |
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
Prisma 5 · Auth.js v5 (credentials + JWT) · next-intl · Recharts · react-hook-form + zod · Vitest · web-push

## Getting started

Requires Node.js 20+ (22+ recommended).

```bash
npm install
cp .env.example .env          # then fill in the values (see below)
npx auth secret               # writes AUTH_SECRET to .env.local — or paste your own
npx prisma db push            # creates prisma/dev.db (SQLite)
npx prisma db seed            # 90 days of demo data
npm run dev
```

Sign in with **demo@dailyrecap.com / demo1234**. The seed is deterministic and only resets the demo user.

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | `file:./dev.db` locally; a Postgres URL in production |
| `AUTH_SECRET` | yes | `npx auth secret` |
| `AUTH_TRUST_HOST` | self-hosting | `true` when running `next start` yourself; not needed on Vercel |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | for reminders | `npx web-push generate-vapid-keys`; subject is `mailto:you@…` |
| `CRON_SECRET` | for reminders | Random string; Vercel Cron sends it as a Bearer token |
| `AI_GATEWAY_API_KEY` | optional | Enables the AI summary on the recap page (Vercel AI Gateway) |
| `AI_SUMMARY_MODEL` | optional | Defaults to `anthropic/claude-haiku-4.5` |

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
5. **Cron:** `vercel.json` schedules `/api/cron/reminders` daily at 13:00 UTC (20:00 WIB) because the
   Hobby plan only allows daily crons. On Pro, change it to `0 * * * *` so each user's own reminder
   hour is honoured.

## Roadmap ideas
Modules that exist in the schema but are hidden until finished (flip `ready` in
`src/components/layout/Sidebar.tsx`): workout, water, body metrics, meditation, goals,
pomodoro, books, skills, TIL.
