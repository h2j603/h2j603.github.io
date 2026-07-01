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

> **Current phase: 라이브 운영 중 (hyuk.xyz).** 스타일링 완료 — 3컬럼 레이아웃
> (좌: Are.na memo 채널 아코디언 / 중: 작품 표 + 커튼 인터랙션 / 우: 수집 링크),
> 행별 보라/갈색 교차 호버, Pretendard Variable(dynamic subset), 라이트 단일
> 테마. 콘텐츠는 Are.na에서만 관리하면 빌드가 반영한다. 기존 인터랙션 문법
> (커튼·블록 단위 호버·마키 라벨)을 깨지 말 것.

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
   Keys: `slug, title, year, medium, size, client, tags, cover,
   published`. All optional. (`order:` 키는 정렬에서 폐기 — 표 순서는
   연도 desc + 같은 연도 안에선 index 채널의 블록 순서를 그대로 따른다)
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
9. **인물 — 별도 레지스트리 없음(폐기됨).** 예전엔 `people` 채널 + 빌드타임
   @멘션 매칭이 있었으나, `people` 채널을 삭제하고 인물 링크를 본문 인라인
   하이퍼링크로 옮겼다. (한/영 이름 자동전환·작품 조인·`data-person`은 없음.)
   **인물 링크는 일반 링크와 색으로 구분한다:** 본문에 `[@이름](url)`처럼 이름
   앞에 `@`를 붙여 적으면 `src/scripts/text.js`가 런타임에 `@`를 떼고(화면엔
   '이름'만) `.mention` 클래스를 붙여 **갈색 pill**로 렌더한다. `@` 없이
   `[이름](url)`로 적으면 일반 **보라 pill**. 아이콘 구분은 없고 색만 다르다.
   적용 범위: 메모(`.intro`)·About(`.about-overlay`)·작품 카드 본문/링크.
10. **메모 (`memo` 채널, 혁이 직접 만든 채널 — 불변 ID `5297539`로 참조).**
    채널 이름 rename 시 Are.na slug가 바뀌어 연결이 끊기므로 slug 대신 숫자
    ID로 건다 (config의 `ARENA_MEMO_CHANNEL`). 텍스트 블록 1개 = 메모 1개 —
    좌측 컬럼 아코디언(블록 title = 접힌 라벨, 본문 = 펼침). 블록의
    connection.created_at을 "추가 시점"으로 표기 (links도 동일). 스냅샷
    `src/data/memos.json`. ⚠️ `.env`의 `ARENA_MEMO_CHANNEL`은 반드시 ID `5297539`
    (옛 슬러그 `notepad-...`는 rename으로 죽음). 배포는 secret 없이 config 기본
    ID를 써서 정상. (links 채널은 아직 slug 참조 — 필요 시 ID로 전환: #5297302.)
11. **수집 링크 (`links` 채널, 실제 슬러그 `collection-gxx8lqhxixg` / #5297302,
    private).** 링크 블록 1개 = 사이트 1개, title = 표시 이름. 우측 컬럼에
    채널 순서대로 본문 pill 스타일 스택으로 렌더 (모바일은 숨김). 스냅샷
    `src/data/links.json`. 채널이 비면 우측 컬럼엔 언어 토글만 남는다.

## File map

| File | Responsibility |
|---|---|
| `src/lib/config.ts` | env + constants |
| `src/lib/arena.ts` | Are.na v3 client (read + write helpers) + `parseDescriptionMetadata` |
| `src/lib/body.ts` | Markdown → semantic HTML (`marked`), defensive |
| `src/lib/images.ts` | `classifyBlock` (image/link/text), download + skip-cache |
| `src/lib/works.ts` | orchestrate channel → validated `Work[]` (per-work error isolation) |
| `src/lib/links.ts` | 수집 링크 채널 fetch (우측 컬럼) |
| `src/lib/schema.ts` | `Work` zod schema (source of truth) + `TAGS` |
| `src/lib/site-data.ts` | page-side: read snapshot + resolve image assets |
| `scripts/build-data.ts` | build-time data step (`--dry-run` supported) |
| `scripts/setup-arena.ts` | idempotent Are.na structure bootstrap |
| `scripts/setup-links.ts` | 수집 링크 채널 생성 + 예시 시드 (멱등) |
| `src/pages/index.astro` | 단일 페이지 — 3컬럼 마크업 (JS는 `src/scripts/`로 분리) |
| `src/scripts/*.js` | 인터랙션 모듈 — main(진입점)·accordion·drawer·stripe(줄무늬+세로선 드래그 리사이즈)·mosaic·lang·memos·link-filter·clock·text·util |

## Commands

```bash
npm install
cp .env.example .env          # fill ARENA_TOKEN + ARENA_INDEX_CHANNEL
npm run setup:arena           # one-time: create the Are.na structure (write token)
npm run setup:links           # one-time: 수집 링크 채널 생성 + 예시 시드
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

## Status (2026-06-12 기준)

- Are.na 라이브 API 검증 완료, 채널 운영 중 (works / memo / links). people 채널 폐기.
- GitHub Pages 배포 정상 (`deploy.yml`, main push 또는 수동 dispatch).
- **소유자는 당분간 폰만 사용 가능 (군 복무)** — 모든 작업은 클라우드 세션에서
  하고, 반드시 PR로 만든 뒤 **세션이 즉시 머지한다** (소유자 사전 확인 불요 —
  diff는 머지 후 GitHub 모바일 앱에서 확인). 검증이 필요한 시각 변경은
  스크린샷이나 측정값을 PR 설명에 남길 것.

## Conventions / guardrails

- Keep build-time-only; no runtime API calls.
- Per-work error isolation: one bad channel logs a warning and is skipped, never
  fatal. `published: false` keeps a work in the table but locks the row —
  the title is a plain label (not a link) and the row can't be expanded
  (no card rendered).
- Don't embed remote Are.na URLs in output — always download locally.
- There are small Node test scripts used during development for the markdown
  converter, block classifier, and description parser; re-create/run them with
  `npx tsx` if you change those modules.
- Work on a feature branch; the default branch is `main`. Don't commit `.env`,
  `node_modules`, `dist/`, or `src/data/works.json` (all gitignored).
- **Workflow (owner's standing instruction): always finish by opening a PR to
  `main` AND merging it** — don't leave branches unmerged. Resolve conflicts
  with `main` first if needed.
