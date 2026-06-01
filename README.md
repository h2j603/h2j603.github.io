# hyuk.xyz — portfolio (Are.na + Google Docs hybrid backend)

A static [Astro](https://astro.build) site whose content lives in two places and
is baked in **at build time** (no runtime API calls):

- **Are.na** — the work list, images, and per-work metadata.
- **Google Docs** — the long-form body text for each work (one Doc per work,
  Korean body → `---` → English body).

Reference architecture: a flat set of static pages, one page per work, Korean
body followed by English body.

> **Status: architecture / data-pipeline scaffold.** Layout is intentionally
> unstyled — the pages exist only to prove data flows from both backends onto
> the page. Styling is a later step.
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
Are.na work channels ──┤        (build time)              (snapshot)         (index + [slug])
  images + metadata     │
Google Docs (doc_id) ──┘
  body text ─ split ko/en ─ converted to clean HTML
```

`npm run build` runs `scripts/build-data.ts` **before** `astro build` so that:

1. images are downloaded to `src/assets/works/<slug>/` before Astro's image
   pipeline globs them, and
2. `src/data/works.json` (the validated snapshot) exists for the pages.

| File | Responsibility |
|---|---|
| `src/lib/config.ts` | env access + constants |
| `src/lib/arena.ts` | Are.na v3 client (read + the few write calls setup needs) |
| `src/lib/docs.ts` | Google Docs (service-account) fetch → ko/en split → semantic HTML |
| `src/lib/images.ts` | classify blocks (image vs link), download images, skip-cache |
| `src/lib/works.ts` | orchestrate Are.na + Docs + images into validated `Work[]` |
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
# ... add images + doc_id metadata in Are.na, write the Docs (see workflow) ...
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
| `GOOGLE_SERVICE_ACCOUNT_JSON` | for bodies | Service-account key: a file path, raw JSON, or base64 JSON. |
| `ARENA_API_BASE` | no | Defaults to `https://api.are.na/v3`. |
| `ARENA_AUTH_SCHEME` | no | Authorization scheme prefix, defaults to `Bearer`. |

`.env` is gitignored. **Never commit credentials.**

### Getting an Are.na token

Are.na → Settings → **Developers / Applications** → create an application →
generate a **personal access token with write scope**. Put it in `ARENA_TOKEN`.

### Getting a Google service account (for Docs bodies)

1. [Google Cloud Console](https://console.cloud.google.com) → create/select a project.
2. **APIs & Services → Library** → enable **Google Docs API** (and **Google
   Drive API** if you later list/lookup Docs).
3. **APIs & Services → Credentials → Create credentials → Service account.**
4. Open the service account → **Keys → Add key → Create new key → JSON.** Download it.
5. Point `GOOGLE_SERVICE_ACCOUNT_JSON` at the file (e.g. `./service-account.json`,
   already gitignored), or paste the JSON / base64 of it into the env var. For
   the GitHub secret, base64 is easiest: `base64 -w0 service-account.json`.
6. **Share each work's Doc** (Viewer) with the service-account email
   (`...@...iam.gserviceaccount.com`) — otherwise the build can't read it.

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
- **Text / Channel blocks** → ignored (body text comes from Google Docs).

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

### Work channel custom metadata (Are.na v3)

| key | example | purpose |
|---|---|---|
| `slug` | `british-poster` | URL path; falls back to the channel slug |
| `title` | `≪british≫ Poster` | title |
| `year` | `2026` | year |
| `medium` | `디지털 프린트` | medium |
| `size` | `420×594mm` | dimensions |
| `client` | `ttt` | client |
| `doc_id` | `1AbC…xyz` | Google Doc ID for the body (the hybrid join key) |
| `order` | `1` | sort order (ascending number) |
| `tags` | `identity, poster` | comma-separated subset of `identity/editorial/poster/type/web`; `web` auto-added for link works |
| `cover` | `2` | 1-based index of the image to use as the index thumbnail; defaults to the first image (or first link thumbnail for web-only works) |
| `published` | `true` | `false` excludes the work from the build |

Missing metadata falls back to defaults. `published=false` skips the work. A
non-numeric `order` logs a warning and uses the default. Unknown `tags` tokens
are warned about and dropped.

---

## Adding a new work

1. In Are.na, **create a work channel** and connect it into the index channel.
   (Or extend `scripts/setup-arena.ts`.)
2. Add **image blocks** to the channel (one or many — all become this work's
   images, in order). Add **link blocks** for live sites / external references.
3. Set the channel's **custom metadata** (`slug`, `title`, `year`, `doc_id`,
   `order`, `tags`, …).
4. Write the body in a **Google Doc**: Korean → a line with just `---` →
   English. **Share it (Viewer) with the service-account email.** Put the Doc ID
   into the channel's `doc_id` metadata.
5. Trigger a rebuild → redeploy: push to `main`, or run the **deploy workflow**
   manually (Actions → "Build & Deploy to GitHub Pages" → *Run workflow*). This
   is your "rebuild" button for Are.na/Docs changes that didn't touch the repo.

---

## Google Docs body conversion

- The body is split on a line containing only `---` (or `***`/`___`): everything
  before is `bodyKo`, everything after is `bodyEn`. No separator → all of it is
  `bodyKo`.
- Output is **clean, unstyled, semantic HTML** only: `<h1>`–`<h6>`, `<p>`,
  `<ul>`/`<ol>`/`<li>`, `<strong>`, `<em>`, `<u>`, `<a>`. The site's CSS owns all
  styling.
- Things that can't be represented faithfully (footnotes, inline objects/images,
  equations, tables, page breaks) are **skipped with a warning**. The converter
  never emits a broken `[object Object]` string (a real failure mode of the old
  docx pipeline — guarded against here and covered by a test).

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
- runs `npm run build` (the GitHub runner has open internet, so the Are.na/Docs
  fetch works there), then deploys `dist/`.

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
- **Connecting a child channel into the index** (`POST /channels/{id}/blocks`)
  is the one write whose body is most uncertain. `setup-arena.ts` tries a few
  shapes and, if they all fail, prints a "connect it in the Are.na UI" fallback —
  channel + metadata creation still succeed. Adjust `connectChannel()` in
  `src/lib/arena.ts` once you've confirmed the real shape.
