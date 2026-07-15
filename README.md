# Feedback Portal

Micro-SaaS for feature requests, upvotes, and an admin Kanban roadmap — with a thin AI analysis stub for future Python dedup/auto-tag.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Zustand (admin Kanban)
- Local Supabase (Auth, Postgres, RLS)

## Getting started

```bash
npm install
npx supabase start
npx supabase db reset
npm run dev
```

Copy [`.env.example`](.env.example) to `.env.local` and fill values from `npx supabase status`.

Use the **JWT anon key** (`eyJ...`), not the `sb_publishable_...` key.

Open [http://localhost:3000](http://localhost:3000).

### Demo accounts (after `db reset`)

| Role   | Email                 | Password    |
|--------|-----------------------|-------------|
| Admin  | admin@feedback.local  | password123 |
| Member | member@feedback.local | password123 |

Only admins can open `/admin` and change request status.

## AI stub

`POST /api/ai/analyze` returns similar requests + suggested tags.

- Default: local heuristic against posts in Supabase
- Optional: set `AI_SERVICE_URL` to proxy to an external Python service (`POST {AI_SERVICE_URL}/analyze`)

## Useful commands

```bash
npx supabase status
npx supabase db reset
npx supabase stop
```
