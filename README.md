# hyuk.xyz — portfolio (Are.na backend)

A static [Astro](https://astro.build) site whose content lives entirely in
**Are.na** and is baked in **at build time** (no runtime API calls). One Are.na
channel per work holds everything:

- **image blocks** → the work's images,
- **text blocks** (Markdown) → the body copy (1st block = Korean, 2nd = English),
- **link blocks** → outbound links + their Are.na thumbnails,
- the **channel description** → the structured metadata (`key: value` lines).

Reference architecture: a flat set of static pages, one page per work, Korean
body followed by English body.

> **Status: architecture / data-pipeline scaffold.** Layout is intentionally
> unstyled — the pages exist only to prove data flows onto the page. Styling is
> a later step.
>
> The previous site is preserved under [`old/`](old/) (including the
> "under construction" page as `old/under-construction.html`).

---

## ⚠ Important: where you can run this

The build **fetches from `api.are.na`**, which is **blocked inside the Claude
Code web/cloud sandbox** (`403 Host not in allowlist`). So:

- **`setup:arena` and `build` (the real fetch) must run somewhere with open
  internet** — your own laptop (Claude Code CLI or a plain terminal), or the
  GitHub Actions runner (see [Deployment](#deployment)). Both have open network.
- Inside the web sandbox you can still develop the code and run
  `npm run build:nofetch` (Astro build against an existing `src/data/works.json`).

This is a network policy of the *sandbox*, not of the project. On your laptop a
normal `npm run build` works.

---

## How it works

```
Are.na index channel ──┐
  (lists work channels) │
                        ├─ scripts/build-data.ts ──► src/data/works.json ──► Astro pages ──► dist/
Are.na work channels ──┘        (build time)              (snapshot)         (index + [slug])
  images + text(ko/en) + links + description metadata
```

`npm run build` runs `scripts/build-data.ts` **before** `astro build` so that:

1. images are downloaded to `src/assets/works/<slug>/` before Astro's image
   pipeline globs them, and
2. `src/data/works.json` (the validated snapshot) exists for the pages.

| File | Responsibility |
|---|---|
| `src/lib/config.ts` | env access + constants |
| `src/lib/arena.ts` | Are.na v3 client (read + the few write calls setup needs) + description-metadata parser |
| `src/lib/body.ts` | Markdown (Are.na text block) → clean semantic HTML |
| `src/lib/images.ts` | classify blocks (image / link / text), download images, skip-cache |
| `src/lib/works.ts` | orchestrate Are.na blocks + metadata into validated `Work[]` |
| `src/lib/schema.ts` | the `Work` zod schema (single source of truth) |
| `src/lib/site-data.ts` | page-side: read the snapshot + resolve image assets |
| `scripts/build-data.ts` | the build-time data step (`--dry-run` to check without writing) |
| `scripts/setup-arena.ts` | idempotent Are.na structure bootstrap |
| `.github/workflows/deploy.yml` | build (with open net) + deploy to GitHub Pages |

---

## Quick start (on a machine with open internet)

```bash
npm install
cp .env.example .env          # then fill in the values (see below)
npm run setup:arena           # one-time: create the Are.na structure
# ... in Are.na: add image blocks, text blocks (ko, en), and the description ...
npm run build                 # fetch everything + build the static site → dist/
npm run preview               # serve dist/ locally
```

- `npm run check:arena` — data step in dry-run mode (fetch + report, writes
  nothing). Handy to confirm credentials and the channel structure.
- `npm run build:nofetch` — `astro build` only, against an existing
  `src/data/works.json` (works even where `api.are.na` is blocked).

---

## Environment variables

Set these in `.env` for local builds and as **repository secrets** for the
GitHub Actions deploy.

| Var | Required | Notes |
|---|---|---|
| `ARENA_TOKEN` | yes | Are.na v3 API token. **Write scope** to run `setup:arena`; read scope is enough for `build`. |
| `ARENA_INDEX_CHANNEL` | yes | Slug of the index channel. Default `works`. |
| `ARENA_API_BASE` | no | Defaults to `https://api.are.na/v3`. |
| `ARENA_AUTH_SCHEME` | no | Authorization scheme prefix, defaults to `Bearer`. |

`.env` is gitignored. **Never commit credentials.**

### Getting an Are.na token

Are.na → Settings → **Developers / Applications** → create an application →
generate a **personal access token with write scope**. Put it in `ARENA_TOKEN`.

---

## Are.na data model

### Index channel

One channel (slug = `ARENA_INDEX_CHANNEL`) that contains every work channel as a
connected **channel block**. `build-data.ts` reads it to discover works.

### Work channel = one work

Each work is its own channel. Blocks are handled **by class**, in channel order:

- **Image / uploaded blocks** → the work's images. **A channel can hold as many
  image blocks as you like** — they all become this work's images, in channel
  order. Each is downloaded locally and run through Astro's image pipeline.
  Per-image optional block metadata `alt` and `caption` are used if present.
- **Link / Media (embed) blocks** → outbound links (`{ url, title, description,
  thumbnail }`). The **Are.na-served thumbnail is downloaded locally** (like any
  image, so the build never depends on a remote URL) and shown next to the link.
  Any work with a link block is automatically tagged **`web`**. Use these for
  "live site", external references, videos, etc.
- **Text blocks** → the body copy, written in **Markdown**. The **1st text block
  is the Korean body, the 2nd is the English body.** Extra text blocks beyond the
  first two are ignored (with a warning).
- **Channel blocks** → ignored inside a work channel (they only matter in the
  index).

The block's class is authoritative, so a Link block's thumbnail is downloaded as
a *link* thumbnail, never mistaken for an uploaded artwork image.

### Classification tags

A single tag axis: **`identity`, `editorial`, `poster`, `type`, `web`**. Set the
channel's `tags` metadata to a comma-separated subset, e.g. `identity, poster`.
A work can carry multiple tags. `web` is added automatically when the work has a
link block (you don't need to type it). Unknown tags are warned about and
dropped. The detail page lists tags; the **index page has a tag-filter** (plain
inline JS toggling `data-tags`, no framework) that shows only the tags actually
in use.

### Work metadata — in the channel **description**

There's no separate "metadata" box in the Are.na UI, so a work's structured
fields live in the **channel description** as `key: value` lines (edit it right
in Are.na: channel → Edit → Description). The build parses these lines; any
free-form prose line (no colon, or a key with spaces) is ignored, so you can mix
a human description with the fields.

```
title: ≪british≫ Poster
year: 2026
medium: 디지털 프린트
size: 420×594mm
client: ttt
order: 1
tags: identity, poster
cover: 2
```

| key | example | purpose |
|---|---|---|
| `slug` | `british-poster` | URL path; falls back to the channel slug |
| `title` | `≪british≫ Poster` | title (falls back to the channel title) |
| `year` | `2026` | year |
| `medium` | `디지털 프린트` | medium |
| `size` | `420×594mm` | dimensions |
| `client` | `ttt` | client |
| `order` | `1` | sort order (ascending number) |
| `tags` | `identity, poster` | comma-separated subset of `identity/editorial/poster/type/web`; `web` auto-added for link works |
| `cover` | `2` | 1-based index of the image to use as the index thumbnail; defaults to the first image (or first link thumbnail for web-only works) |
| `published` | `true` | `false` keeps the work in the table but locks the row (not clickable / can't expand) |

All keys are optional. Missing fields fall back to defaults. `published: false`
keeps the row in the table but makes it un-clickable (the title is a plain label,
not a link, and no card is rendered). A non-numeric `order` logs a warning and uses the default.
Unknown `tags` tokens are warned about and dropped. Keys are case-insensitive.

`scripts/setup-arena.ts` seeds each sample channel's description with these
lines; after that you edit them directly in Are.na.

---

## Adding a new work

1. In Are.na, **create a work channel** and connect it into the index channel.
   (Or extend `scripts/setup-arena.ts`.)
2. Add **image blocks** to the channel (one or many — all become this work's
   images, in order). Add **link blocks** for live sites / external references.
3. Add **text blocks** for the body (Markdown): the **1st** is the Korean body,
   the **2nd** is the English body.
4. Fill in the channel **description** with the `key: value` metadata lines
   (`slug`, `title`, `year`, `order`, `tags`, `cover`, …).
5. Trigger a rebuild → redeploy: push to `main`, or run the **deploy workflow**
   manually (Actions → "Build & Deploy to GitHub Pages" → *Run workflow*). This
   is your "rebuild" button for Are.na changes that didn't touch the repo.

---

## Body text (Markdown in Are.na text blocks)

- The 1st text block in a channel is the Korean body, the 2nd is the English
  body. Write them in normal **Markdown**:

  | you type | you get |
  |---|---|
  | `**굵게**` | **bold** |
  | `*기울임*` | *italic* |
  | `[텍스트](https://…)` | a link |
  | `## 소제목` | a heading |
  | `- 항목` / `1. 항목` | a bullet / numbered list |

- Output is **clean, unstyled, semantic HTML** (`<h1>`–`<h6>`, `<p>`,
  `<ul>`/`<ol>`/`<li>`, `<strong>`, `<em>`, `<a>`). The site's CSS owns all
  styling. The converter only ever receives a string and guards its output
  against the `[object Object]` marker (a real failure mode of the old docx
  pipeline — covered by a test).

---

## Error handling

- A single failing work channel or Doc is **logged and skipped**, never fatal.
- Already-downloaded images are **skipped** (cache by filename).
- `build-data.ts` prints a summary: total / built / unpublished / failed /
  warnings, plus a per-work line.

---

## Deployment

Deploys to **GitHub Pages** with the custom domain **hyuk.xyz**
(`public/CNAME`, copied verbatim into `dist/`). The workflow
`.github/workflows/deploy.yml`:

- runs on push to `main` and on manual dispatch,
- runs `npm run build` (the GitHub runner has open internet, so the Are.na fetch
  works there), then deploys `dist/`.

One-time setup: repo **Settings → Pages → Source = GitHub Actions**, and add the
env vars above as repo **secrets**. Confirm the custom domain is set to
`hyuk.xyz`.

---

## Notes & known unknowns

- The Are.na **v3 OpenAPI spec could not be read while authoring** (the host is
  blocked in the build sandbox), so endpoint paths follow Are.na conventions and
  the client reads responses defensively / paginates by walking pages until
  short. Confirm against the live spec (`https://api.are.na/v3/openapi`) on first
  run with open network and tighten if needed. The READ path (build) is the
  least likely to differ.
- **Metadata lives in the channel description, not Are.na "custom metadata".**
  v3 custom metadata has no editing box in the Are.na UI, so we store the
  `key: value` fields in the description instead (read via `GET /channels/{id}`,
  written by `setup-arena.ts` via `PUT /channels/{id}` with `{ description }`).
  This means everything is editable directly in Are.na. Confirm the description
  read/write field names against the live API on first run.
- **Connecting a child channel into the index** (`POST /channels/{id}/blocks`)
  is the one write whose body is most uncertain. `setup-arena.ts` tries a few
  shapes and, if they all fail, prints a "connect it in the Are.na UI" fallback —
  channel creation + the description write still succeed. Adjust
  `connectChannel()` in `src/lib/arena.ts` once you've confirmed the real shape.
