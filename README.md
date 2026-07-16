# Feedback Portal

Micro-SaaS for feature requests, upvotes, comments, and an admin Kanban roadmap — with a built-in local duplicate detection engine.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Zustand (admin Kanban)
- Supabase (Auth, Postgres, RLS)
- White-label multi-tenant boards via `projects` + `?tenant=<slug>`

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

## Multi-tenant / white-label (connect flow)

This portal does **not** hand-create product tenants. Host apps connect; the portal reads their name/logo and opens a board.

```text
# Host product opens:
http://localhost:3000/connect?url=https://your-product.example

# After connect, users land on:
http://localhost:3000/?tenant=<auto-slug>
http://localhost:3000/admin?tenant=<auto-slug>
```

Flow:
1. `/connect?url=...` fetches the site title / og metadata and upserts a `projects` row (`connect_project`).
2. Board UI loads that project’s name, logo, theme, and feature flags.
3. The **first user who signs up/in on that tenant board** becomes its admin (`claim_project_access`). Later users join as members.
4. Platform-wide `profiles.is_admin` still governs the universal board (`project_id IS NULL`).

API equivalent: `POST /api/projects/connect` with `{ "url": "https://..." }` (optional `name`, `logoUrl`, `themeConfig`).

## Duplicate detection

Search and duplicate detection run entirely locally (no external API, no quota):

1. Text is normalized for Turkish/English and reduced to tokens + character trigrams.
2. Known concepts group cross-language equivalents, so “koyu mod”, “dark mode”, and “Dark Thema” all match.
3. The idea form calls `POST /api/search/similar` to surface likely duplicates and suggest tags before submitting.
4. Admins review clustered duplicates in `/admin` and merge them (`GET`/`POST /api/search/duplicates`); votes, comments, and tags move to the kept request.

The engine lives in `lib/search/` and is fully independent, so submissions never block on an external service.

## Useful commands

```bash
npm test
npx supabase status
npx supabase db reset
npx supabase stop
```
