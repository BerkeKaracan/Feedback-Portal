# Feedback Portal

Micro-SaaS for feature requests, upvotes, comments, and an admin Kanban roadmap — with a built-in local duplicate detection engine.

## Live demo

**Production:** [https://feedback-portal-lyart.vercel.app/](https://feedback-portal-lyart.vercel.app/)

| Page | URL |
|------|-----|
| Home | https://feedback-portal-lyart.vercel.app/ |
| Connect product | https://feedback-portal-lyart.vercel.app/connect |
| My boards | https://feedback-portal-lyart.vercel.app/boards |

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

### Auth (Google + GitHub only)

The app UI does **not** offer email/password sign-in. Disable the Email provider in
Supabase → Authentication → Providers so password auth is off at the API layer too.

1. **Google Cloud Console** → OAuth client (Web)  
   Authorized redirect URI:  
   `https://lttbqwzougpkorbhlnsm.supabase.co/auth/v1/callback`
2. **GitHub** → Developer settings → OAuth App  
   Authorization callback URL:  
   `https://lttbqwzougpkorbhlnsm.supabase.co/auth/v1/callback`
3. Supabase → Authentication → Providers → enable **Google** and **GitHub** (paste Client ID + Secret). Disable **Email**.
4. Supabase → Authentication → URL Configuration:
   - **Site URL must be the live app** (not localhost), or Google/GitHub login
     after OAuth dumps you on `localhost` even when you tested on Vercel:
     `https://feedback-portal-lyart.vercel.app`
   - Redirect URLs (allow-list):
     - `https://feedback-portal-lyart.vercel.app/auth/callback`
     - `https://feedback-portal-lyart.vercel.app/**`
     - `http://localhost:3000/auth/callback` (only if you also develop locally)
     - `http://localhost:3000/**`

5. Vercel → Environment Variables → set for Production:
   `NEXT_PUBLIC_SITE_URL=https://feedback-portal-lyart.vercel.app`
   then redeploy.

App callback route: `/auth/callback` (exchanges `code` for a session, preserves `?next=` for tenant/boards).

OAuth users arrive with a verified email from the provider — no SMTP or confirm mail needed.

## Multi-tenant / white-label (connect flow)

This portal does **not** hand-create product tenants. Customers **sign in**, **prove domain ownership**, connect a site, and the board is **saved on their account** (`project_members`) so closing the tab never loses it.

```text
# Customer-facing connect UI:
https://feedback-portal-lyart.vercel.app/connect
# or local:
http://localhost:3000/connect

# After connect (account-bound):
.../?tenant=<auto-slug>
.../admin?tenant=<auto-slug>
.../boards   ← reopen any board you own/joined
```

Flow:
1. Sign in (required — no anonymous connect).
2. Start verification → publish the token on the product domain (see Next.js note below).
3. Verify & connect → metadata upsert + `claim_project_access` (first verified connector = project admin).
4. Reopen anytime from **My boards**.
5. Platform-wide `profiles.is_admin` still governs the universal board (`project_id IS NULL`).

### Next.js / Vercel host apps (important)

`/.well-known/...` 404s if the file is not in `public/`. Easiest:

```bash
# in the host product repo
mkdir -p public
echo 'fp_verify_YOUR_TOKEN_HERE' > public/feedback-portal-verify.txt
# deploy, then open:
# https://your-app.vercel.app/feedback-portal-verify.txt
```

We also accept:
- `/api/feedback-portal-verify` (plain text or `{ "token": "fp_verify_..." }`)
- `/.well-known/feedback-portal-verify.txt` (`public/.well-known/...`)

APIs (authenticated):
- `POST /api/projects/verify/start` `{ "url": "https://..." }` → `{ challengeId, token, verifyUrl, verifyUrls }`
- `POST /api/projects/connect` `{ "url", "challengeId" }` → board + redirect (only after token match)

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
