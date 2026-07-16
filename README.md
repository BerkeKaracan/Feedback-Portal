# Feedback Portal

Micro-SaaS for feature requests, upvotes, comments, and an admin Kanban roadmap — with a built-in local duplicate detection engine.

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

## Duplicate detection

Search and duplicate detection run entirely locally (no external API, no quota):

1. Text is normalized for Turkish/English and reduced to tokens + character trigrams.
2. Known concepts group cross-language equivalents, so “koyu mod”, “dark mode”, and “Dark Thema” all match.
3. The idea form calls `POST /api/search/similar` to surface likely duplicates and suggest tags before submitting.
4. Admins review clustered duplicates in `/admin` and merge them (`GET`/`POST /api/search/duplicates`); votes, comments, and tags move to the kept request.

The engine lives in `lib/search/` and is fully independent, so submissions never block on an external service.

## Useful commands

```bash
npx supabase status
npx supabase db reset
npx supabase stop
```
