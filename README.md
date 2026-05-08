# hyuk.xyz

Next.js + Supabase rebuild of `hyuk.xyz`. Static portfolio site reborn as a
dynamic site with an admin panel for managing works, images, and design
parameters.

The original static site is preserved under `public/archive/` and served at
`/archive/`.

## Stack

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS + CSS variables for design tokens
- Supabase: Postgres, Storage, Auth
- Adobe Typekit (kit `hvw8xwa`, kept from the original site)
- Image optimization via `next/image`

## Routes

| URL | Purpose |
|---|---|
| `/` | Home — 9×9 work grid + control panel |
| `/works/[slug]` | Work detail page |
| `/archive/` | Original static site |
| `/admin` | Works manager (auth required) |
| `/admin/design` | Design parameters with live preview |
| `/admin/login` | Admin sign-in |

## Local setup

1. `cp .env.local.example .env.local` and fill in your Supabase URL + keys.
2. Apply the migrations in `supabase/migrations/` (in order) and run `supabase/seed.sql`.
3. Create one admin user in Supabase Auth (email + password).
4. `npm install`
5. `npm run dev`

## Architecture notes

- **Vertical typesetting is JS-driven, not `writing-mode`.** Titles are split
  one cell per character (`lib/grid-utils.ts`), so KR / hanja / EN all use one
  cell each — the "全角" (full-width) feel from print typography.
- **Right-to-left fill.** Works fill from the rightmost column toward the left.
  See `columnForWork` in `lib/grid-utils.ts`.
- **Design parameters** are stored in `site_settings` (single row, id=1) and
  injected as CSS variables in `app/(public)/layout.tsx`. The admin design page
  applies them live to a preview iframe.
- **Auth gate** lives in `middleware.ts` via `lib/supabase/middleware.ts`.
  All `/admin/*` paths except `/admin/login` require an authenticated session.
- **Admin chrome** layout is scoped to `app/admin/(chrome)/`, so the login
  page renders without the nav header.

## Bumping things up

- Adding a category beyond T/W/E/I/+: update `CATEGORIES` in `lib/types.ts`,
  the grid layout in `components/panel/CategoryGrid.tsx`, and the
  `valid_categories` check constraint in `001_initial_schema.sql`.
- Changing the grid size for the whole site: just change it from
  `/admin/design`. Stored in `site_settings.grid.size` and read by the grid
  components via the settings provider.
