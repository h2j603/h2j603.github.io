/**
 * Central environment / config access.
 *
 * Loads `.env` (for the standalone tsx scripts; Astro loads it on its own) and
 * exposes typed getters. Nothing here throws at import time — callers decide
 * which vars they actually need, so e.g. `build:data` can run without write
 * access and `setup:arena` can fail loudly only when a write token is missing.
 */
import 'dotenv/config';

export const ARENA_API_BASE =
  process.env.ARENA_API_BASE?.replace(/\/$/, '') ?? 'https://api.are.na/v3';

/** Auth scheme prefix for the Authorization header. Are.na v3 uses Bearer. */
export const ARENA_AUTH_SCHEME = process.env.ARENA_AUTH_SCHEME ?? 'Bearer';

export const ARENA_INDEX_CHANNEL = process.env.ARENA_INDEX_CHANNEL ?? 'works';

/** 좌측 인트로(About) 채널의 슬러그 — 텍스트 블록들이 hr로 구분되어 표시됨. */
export const ARENA_INTRO_CHANNEL = process.env.ARENA_INTRO_CHANNEL ?? 'hyuk-intro';

/** 좌측 footer 채널의 슬러그 — 텍스트 블록들이 hr로 구분되어 표시됨. */
export const ARENA_FOOTER_CHANNEL = process.env.ARENA_FOOTER_CHANNEL ?? 'hyuk-footer';

/** 인물 레지스트리 채널 슬러그 — 링크 블록 1개 = 인물 1명.
    본문 @멘션이 빌드 타임에 여기와 매칭된다 (setup:people로 생성).
    'people'은 전역 점유라 실제 슬러그에 접미사가 붙음 (채널 ID #5296875). */
export const ARENA_PEOPLE_CHANNEL =
  process.env.ARENA_PEOPLE_CHANNEL ?? 'people-vbm5erq60ra';

/** 수집 링크 채널 슬러그 — 우측 컬럼에 표시되는 사이트 링크 모음.
    'links'도 전역 점유라 접미사 붙은 실제 슬러그 사용 (채널 ID #5297302). */
export const ARENA_LINKS_CHANNEL =
  process.env.ARENA_LINKS_CHANNEL ?? 'links-fccchcri-lm';

export function getArenaToken(): string | undefined {
  return process.env.ARENA_TOKEN || undefined;
}

/** Throws with a helpful message if the Are.na token is absent. */
export function requireArenaToken(): string {
  const t = getArenaToken();
  if (!t) {
    throw new Error(
      'ARENA_TOKEN is not set. Add it to .env (write scope is required for setup:arena).',
    );
  }
  return t;
}

/** Local directory (relative to repo root) where downloaded images are cached. */
export const ASSETS_WORKS_DIR = 'src/assets/works';

/** Where the build-time data snapshot is written. */
export const DATA_FILE = 'src/data/works.json';

/** 좌측 인트로 블록 데이터가 저장되는 파일 (JSON 배열 — 각 블록의 lang/html). */
export const INTRO_FILE = 'src/data/intro.json';

/** 좌측 footer 블록 데이터가 저장되는 파일. */
export const FOOTER_FILE = 'src/data/footer.json';

/** 인물 레지스트리 스냅샷 파일 (관계형 데이터 — 우측 컬럼 등 향후 UI용). */
export const PEOPLE_FILE = 'src/data/people.json';

/** 수집 링크 스냅샷 파일 (우측 컬럼 렌더용). */
export const LINKS_FILE = 'src/data/links.json';
