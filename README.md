# Feedback Portal

Micro-SaaS for feature requests, upvotes, and an admin Kanban roadmap.

## Phase 1 (current)

- Public board with dummy data (`/`)
- Admin Kanban scaffold (`/admin`)
- shadcn/ui, Zustand, Supabase client stubs

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local` when connecting Supabase (Phase 2).

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Zustand (admin Kanban)
- Supabase (Auth, Postgres, RLS — next phase)
