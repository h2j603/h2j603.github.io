/**
 * Minimal Are.na v3 client.
 *
 * Endpoints / shapes are verified against the live OpenAPI spec
 * (https://api.are.na/v3/openapi):
 *
 *   GET    /channels/{id}                — fetch a channel (id or slug)
 *   GET    /channels/{id}/contents       — list blocks + sub-channels (paginated)
 *   POST   /channels                     — create a channel
 *   PUT    /channels/{id}                — update channel (incl. description)
 *   POST   /connections                  — connect an existing channel/block
 *
 * Notes:
 * - List responses are `{ data: [...], total_pages, current_page, ... }`.
 * - Pagination uses `page` / `per` (per ≤ 100).
 * - Block discrimination is `block.type` (PascalCase: Text / Image / Link /
 *   Attachment / Embed / PendingBlock / Channel).
 * - `description` on Channel reads as `MarkdownContent` (`{markdown, html,
 *   plain}`) or null, but writes as a plain string.
 */
import {
  ARENA_API_BASE,
  ARENA_AUTH_SCHEME,
  getArenaToken,
  requireArenaToken,
} from './config.js';

const PER_PAGE = 100;

type Json = Record<string, any>;

/** 빌드 한 번에 보낸 API 요청 수 — 효율 회귀 감시용 (build-data 요약에 출력). */
let requestCount = 0;
export function getRequestCount(): number {
  return requestCount;
}

async function request(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<Json> {
  const { token, headers, ...rest } = init;
  const auth = token ?? getArenaToken();
  requestCount++;
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
      /* non-JSON body; let the status check report */
    }
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || text || res.statusText;
    throw new Error(`Are.na ${res.status} ${rest.method ?? 'GET'} ${path}: ${msg}`);
  }
  return data ?? {};
}

/** Pull every page of a list endpoint (`{ data: [...] }`) into one array. */
async function getAll(path: string): Promise<Json[]> {
  const items: Json[] = [];
  for (let page = 1; ; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const res = await request(`${path}${sep}page=${page}&per=${PER_PAGE}`);
    const batch: Json[] = Array.isArray(res.data) ? res.data : [];
    items.push(...batch);
    if (batch.length < PER_PAGE) break;
    if (page > 100) break; // safety valve
  }
  return items;
}

/**
 * Read a Markdown-content field that may be a `MarkdownContent` object
 * (`{markdown, html, plain}`), a plain string, or null. Returns the Markdown.
 */
export function readMarkdown(field: any): string {
  if (typeof field === 'string') return field;
  if (typeof field?.markdown === 'string') return field.markdown;
  return '';
}

export interface ArenaChannel {
  id: number;
  slug: string;
  title: string;
  /** Channel description as Markdown text. */
  description: string;
}

export async function getChannel(slugOrId: string | number): Promise<ArenaChannel | null> {
  try {
    const c = await request(`/channels/${encodeURIComponent(String(slugOrId))}`);
    if (!c || !c.id) return null;
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: readMarkdown(c.description),
    };
  } catch (err: any) {
    const msg = String(err.message);
    // 404 = 채널 없음, 403 = 다른 유저가 점유한 비공개 채널 → 둘 다 "내 게 아님"으로 처리
    if (msg.includes(' 404 ') || msg.includes(' 403 ')) return null;
    throw err;
  }
}

/** All blocks (and sub-channels) in a channel, in channel order. */
export async function getChannelContents(slugOrId: string | number): Promise<Json[]> {
  return getAll(`/channels/${encodeURIComponent(String(slugOrId))}/contents`);
}

/**
 * getChannelContents의 관대한 버전 — 채널이 없거나(404) 남의 비공개(403)면
 * null. 채널 메타가 필요 없는 보조 채널(people/links/intro/footer)은 이걸로
 * 존재 확인용 getChannel 요청 한 번씩을 아낀다.
 */
export async function tryGetChannelContents(
  slugOrId: string | number,
): Promise<Json[] | null> {
  try {
    return await getChannelContents(slugOrId);
  } catch (err: any) {
    const msg = String(err.message);
    if (msg.includes(' 404 ') || msg.includes(' 403 ')) return null;
    throw err;
  }
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
  if (!c?.id) throw new Error(`createChannel: unexpected response ${JSON.stringify(c)}`);
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: readMarkdown(c.description),
  };
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
 * Connect an existing channel into a parent channel as a sub-channel.
 *
 * Uses POST /v3/connections — the connectable is the child channel, the target
 * is the parent. The parent ID must be a numeric channel ID (not a slug).
 */
export async function connectChannel(
  parentId: number,
  childId: number,
): Promise<void> {
  const token = requireArenaToken();
  await request('/connections', {
    method: 'POST',
    token,
    body: JSON.stringify({
      connectable_id: childId,
      connectable_type: 'Channel',
      channel_ids: [parentId],
    }),
  });
}

/** Delete a channel (irreversible). */
export async function deleteChannel(channelId: number): Promise<void> {
  const token = requireArenaToken();
  await request(`/channels/${channelId}`, { method: 'DELETE', token });
}

/**
 * Create a Link/Image/Embed block in a channel.
 *
 * Uses POST /v3/blocks — Are.na infers the block type from the value:
 *   - URL → Link / Image / Embed (auto-scraped, thumbnail generated)
 *   - plain text → Text block
 */
export async function createBlock(
  channelId: number,
  value: string,
  options: { title?: string; description?: string } = {},
): Promise<Json> {
  const token = requireArenaToken();
  const body: Json = {
    value,
    channel_ids: [channelId],
  };
  if (options.title) body.title = options.title;
  if (options.description) body.description = options.description;
  return request('/blocks', {
    method: 'POST',
    token,
    body: JSON.stringify(body),
  });
}

/** 블록이 채널에 추가된 시각 (ISO) — connection.created_at(연결 시각) 우선,
    없으면 블록 생성 시각. Are.na가 블록에 표기하는 "added"와 같은 기준. */
export function blockAddedAt(block: Json): string {
  const t = block?.connection?.created_at ?? block?.created_at;
  return typeof t === 'string' ? t : '';
}
