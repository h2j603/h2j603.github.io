# CLAUDE.md — project context & handoff

> This file is the **handoff note** from the web Claude Code session to local
> CLI sessions. The conversation history does not transfer between web and CLI,
> but this file (auto-loaded at session start) carries the context. Keep it
> up to date as the project evolves.

## What this project is

Personal portfolio site for **hyuk.xyz** (deployed to GitHub Pages from the
`h2j603/h2j603.github.io` repo). Static [Astro](https://astro.build) site with a
**single backend: Are.na**. All content is fetched **at build time** (no runtime
API calls) and baked into static HTML.

The previous site is preserved under `old/`. `CNAME` (hyuk.xyz) lives in
`public/` so Astro copies it into `dist/`.

> **Current phase: architecture/data-pipeline is done; the site is intentionally
> UNSTYLED.** The pages only prove data flows. Styling is the next major phase.

## Architecture (the decisions we made, in order)

1. **Astro SSG + build-time fetch.** `scripts/build-data.ts` runs before
   `astro build`, writes a validated snapshot `src/data/works.json`, and
   downloads images locally first (so Astro's image pipeline can process them
   and the build never depends on remote URLs).
2. **Two-level Are.na structure.** One **index channel** (`ARENA_INDEX_CHANNEL`,
   default `works`) contains each **project as a connected channel block**. One
   sub-channel = one project/work.
3. **Everything lives in the work's Are.na channel:**
   - **image blocks** → the work's images (as many as you want, in order),
   - **text blocks** (Markdown) → body copy; **1st block = Korean, 2nd =
     English** (extra text blocks ignored with a warning),
   - **link blocks** → outbound links; the **Are.na thumbnail is downloaded
     locally** and any work with a link is auto-tagged `web`,
   - **channel description** → structured metadata as `key: value` lines.
4. **Metadata is in the channel DESCRIPTION**, not Are.na "custom metadata"
   (v3 custom metadata has no UI editing box). Parsed at build time. Free-form
   prose lines (no colon / spaced key) are ignored, so prose + fields can mix.
   Keys: `slug, title, year, medium, size, client, order, tags, cover,
   published`. All optional.
5. **Classification tags** — one axis: `identity, editorial, poster, type, web`.
   `tags: identity, poster` in the description. Multiple allowed; `web` is
   auto-added for link works; unknown tokens dropped with a warning.
6. **Cover image** for index thumbnails: `cover` (1-based index) → else first
   image → else first link thumbnail.
7. **Markdown bodies** (`**bold**`, `*italic*`, `[text](url)`, `## heading`,
   `- list`) → clean *unstyled* semantic HTML via `marked`. Output is guarded
   against the `[object Object]` marker. (We dropped Google Docs entirely — it
   was the old plan; now body text is Are.na text blocks.)
8. **Deploy:** GitHub Pages via `.github/workflows/deploy.yml` (push to `main`
   or manual dispatch). The runner has open internet so the Are.na fetch works
   there.

## File map

| File | Responsibility |
|---|---|
| `src/lib/config.ts` | env + constants |
| `src/lib/arena.ts` | Are.na v3 client (read + write helpers) + `parseDescriptionMetadata` |
| `src/lib/body.ts` | Markdown → semantic HTML (`marked`), defensive |
| `src/lib/images.ts` | `classifyBlock` (image/link/text), download + skip-cache |
| `src/lib/works.ts` | orchestrate channel → validated `Work[]` (per-work error isolation) |
| `src/lib/schema.ts` | `Work` zod schema (source of truth) + `TAGS` |
| `src/lib/site-data.ts` | page-side: read snapshot + resolve image assets |
| `scripts/build-data.ts` | build-time data step (`--dry-run` supported) |
| `scripts/setup-arena.ts` | idempotent Are.na structure bootstrap |
| `src/pages/index.astro` | work list + cover thumbnails + tag filter (inline JS) |
| `src/pages/works/[slug].astro` | per-work detail page |

## Commands

```bash
npm install
cp .env.example .env          # fill ARENA_TOKEN + ARENA_INDEX_CHANNEL
npm run setup:arena           # one-time: create the Are.na structure (write token)
npm run check:arena           # dry-run fetch + report (writes nothing)
npm run build                 # fetch Are.na + astro build → dist/
npm run preview               # serve dist/
npm run build:nofetch         # astro build only, against existing works.json
```

## Environment

- `ARENA_TOKEN` — Are.na v3 token. **Write scope** for `setup:arena`; read is
  enough for `build`. Get it: Are.na → Settings → Developers → new application →
  personal access token (write).
- `ARENA_INDEX_CHANNEL` — index channel slug (default `works`).
- `.env` is gitignored; mirror these as **repo secrets** for the deploy workflow.

## ⚠️ Status & next steps (do these on the laptop — open internet)

The real Are.na work has NOT been done yet (the web sandbox blocked
`api.are.na`, so the code is written but unverified against the live API).

1. **Read the live OpenAPI spec** `https://api.are.na/v3/openapi` and verify the
   endpoints/bodies the code guesses. Highest-uncertainty spots, all in
   `src/lib/arena.ts`:
   - channel **description** field name on read (`GET /channels/{id}`) and write
     (`setChannelDescription` uses `PUT /channels/{id}` `{description}`),
   - **connecting a child channel** into the index (`connectChannel`,
     `POST /channels/{id}/blocks`) — tries 3 body shapes, may need fixing,
   - block **class** spellings and **image/thumbnail URL** fields used by
     `classifyBlock` / `bitmapUrl` in `src/lib/images.ts`,
   - **pagination** params in `getAll` (`page`/`per`).
2. `npm run setup:arena` → create `works` + sample channels. If channel
   connection fails, just drag the channel into `works` in the Are.na UI.
3. Add real content: image blocks, two text blocks (ko, en), link blocks, and
   the `key: value` description per work.
4. `npm run build` and check `dist/`. Then set repo Settings → Pages → Source =
   GitHub Actions, add secrets, confirm custom domain hyuk.xyz.
5. **Then: styling.** Everything so far is unstyled on purpose.

## Conventions / guardrails

- Keep build-time-only; no runtime API calls.
- Per-work error isolation: one bad channel logs a warning and is skipped, never
  fatal. `published: false` skips a work.
- Don't embed remote Are.na URLs in output — always download locally.
- There are small Node test scripts used during development for the markdown
  converter, block classifier, and description parser; re-create/run them with
  `npx tsx` if you change those modules.
- Work on a feature branch; the default branch is `main`. Don't commit `.env`,
  `node_modules`, `dist/`, or `src/data/works.json` (all gitignored).
- **Workflow (owner's standing instruction): always finish by opening a PR to
  `main` AND merging it** — don't leave branches unmerged. Resolve conflicts
  with `main` first if needed.
