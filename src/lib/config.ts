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

export function getGoogleServiceAccountRaw(): string | undefined {
  return process.env.GOOGLE_SERVICE_ACCOUNT_JSON || undefined;
}

/** Local directory (relative to repo root) where downloaded images are cached. */
export const ASSETS_WORKS_DIR = 'src/assets/works';

/** Where the build-time data snapshot is written. */
export const DATA_FILE = 'src/data/works.json';
