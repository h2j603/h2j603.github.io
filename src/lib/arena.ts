/**
 * Minimal Are.na v3 client.
 *
 * ⚠ The v3 OpenAPI spec (https://api.are.na/v3/openapi) could not be read from
 * the build sandbox where this was authored (the host is blocked there), so the
 * endpoint *paths* below follow Are.na's documented conventions and the client
 * is written defensively: responses are read tolerantly (several historical key
 * spellings accepted) and write-request bodies try a couple of shapes. When you
 * first run this with real network access, confirm the paths/bodies against the
 * live spec and tighten as needed. The READ path (build) is the important one
 * and is the least likely to differ.
 *
 *   GET    /channels/{channel}                 — fetch a channel
 *   GET    /channels/{channel}/contents        — list blocks (paginated)
 *   GET    /channels/{channel}/metadata        — list custom metadata
 *   POST   /channels                           — create channel
 *   POST   /channels/{channel}/metadata        — create metadatum {key,value}
 *   POST   /channels/{channel}/blocks          — add/connect a block
 */
import {
  ARENA_API_BASE,
  ARENA_AUTH_SCHEME,
  getArenaToken,
  requireArenaToken,
} from './config.js';

const PER_PAGE = 100;

type Json = Record<string, any>;

async function request(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<Json> {
  const { token, headers, ...rest } = init;
  const auth = token ?? getArenaToken();
  const res = await fetch(`${ARENA_API_BASE}${path}`, {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
      ...(auth ? { Authorization: `${ARENA_AUTH_SCHEME} ${auth}` } : {}),
      ...headers,
    },
  });
  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      /* non-JSON body; leave as null and let the status check report it */
    }
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || text || res.statusText;
    throw new Error(`Are.na ${res.status} ${rest.method ?? 'GET'} ${path}: ${msg}`);
  }
  return data ?? {};
}

/** Pull every page of a list endpoint into one array. */
async function getAll(path: string): Promise<Json[]> {
  const items: Json[] = [];
  for (let page = 1; ; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const data = await request(`${path}${sep}page=${page}&per=${PER_PAGE}`);
    // Are.na list payloads have used a few key names over the years.
    const batch: Json[] =
      data.contents ?? data.blocks ?? data.channels ?? data.metadata ?? [];
    items.push(...batch);
    if (batch.length < PER_PAGE) break;
    // Safety valve against a misbehaving/non-paginated endpoint.
    if (page > 100) break;
  }
  return items;
}

export interface ArenaChannel {
  id: number;
  slug: string;
  title: string;
  /** The channel's description text (Are.na "metadata"/description field). */
  description: string;
}

export async function getChannel(slugOrId: string | number): Promise<ArenaChannel | null> {
  try {
    const c = await request(`/channels/${encodeURIComponent(String(slugOrId))}`);
    if (!c || !c.id) return null;
    // Are.na has spelled the description field a few ways across versions.
    const description =
      c.description ?? c.metadata?.description ?? c.about ?? '';
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: typeof description === 'string' ? description : '',
    };
  } catch (err: any) {
    if (String(err.message).includes(' 404 ')) return null;
    throw err;
  }
}

/** All blocks in a channel, in channel order. */
export async function getChannelContents(slugOrId: string | number): Promise<Json[]> {
  return getAll(`/channels/${encodeURIComponent(String(slugOrId))}/contents`);
}

/**
 * Parse a channel description into a flat key→value map.
 *
 * Each metadata line looks like `key: value`. Keys are lowercased and trimmed.
 * Lines without a colon (free-form prose) are ignored, so you can mix a human
 * description with the structured fields. The first colon splits key/value, so
 * values may themselves contain colons (e.g. URLs).
 *
 * Example description:
 *   title: ≪british≫ Poster
 *   year: 2026
 *   tags: identity, poster
 *   cover: 2
 */
export function parseDescriptionMetadata(description: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of (description ?? '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const colon = line.indexOf(':');
    if (colon < 1) continue; // no colon, or starts with colon → not a field
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    // Keys are simple identifiers; ignore lines whose "key" has spaces (prose).
    if (!/^[a-z0-9_]+$/.test(key)) continue;
    out[key] = value;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Write operations (used only by scripts/setup-arena.ts).
// ---------------------------------------------------------------------------

export async function createChannel(
  title: string,
  visibility: 'public' | 'private' | 'closed' = 'public',
): Promise<ArenaChannel> {
  const token = requireArenaToken();
  const c = await request('/channels', {
    method: 'POST',
    token,
    body: JSON.stringify({ title, visibility }),
  });
  // Response may be the channel directly or wrapped.
  const ch = c.channel ?? c;
  if (!ch?.id) throw new Error(`createChannel: unexpected response ${JSON.stringify(c)}`);
  return { id: ch.id, slug: ch.slug, title: ch.title, description: ch.description ?? '' };
}

/** Render a key→value map as the `key: value` lines we store in a description. */
export function formatDescriptionMetadata(meta: Record<string, string>): string {
  return Object.entries(meta)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

/** Overwrite a channel's description text. */
export async function setChannelDescription(
  channel: string | number,
  description: string,
): Promise<void> {
  const token = requireArenaToken();
  await request(`/channels/${encodeURIComponent(String(channel))}`, {
    method: 'PUT',
    token,
    body: JSON.stringify({ description }),
  });
}

/**
 * Connect an existing channel into a parent channel as a channel-block.
 *
 * The exact request body for POST /channels/{channel}/blocks is the part of the
 * write API most likely to differ from these guesses, so we try the
 * historically-correct connection shapes in order. If all fail we throw, and
 * the caller falls back to a printed "connect it manually in the UI"
 * instruction — channel creation still succeeds.
 */
export async function connectChannel(
  parent: string | number,
  childId: number,
): Promise<void> {
  const token = requireArenaToken();
  const base = `/channels/${encodeURIComponent(String(parent))}/blocks`;
  const attempts: Json[] = [
    { connectable_type: 'Channel', connectable_id: childId },
    { connectable: { type: 'Channel', id: childId } },
    { source: { type: 'Channel', id: childId } },
  ];
  let lastErr: unknown;
  for (const body of attempts) {
    try {
      await request(base, { method: 'POST', token, body: JSON.stringify(body) });
      return;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('connectChannel failed');
}
