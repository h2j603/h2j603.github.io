/**
 * 수집 링크 — Are.na `links` 채널 (링크 블록 1개 = 사이트 1개).
 *
 * 우측 컬럼에 채널 순서대로 쌓이는 사이트 컬렉션. Are.na에 링크 블록을
 * 추가하면 다음 빌드에 반영된다. 블록 title이 표시 이름 (없으면 URL).
 * 채널이 없거나 비어 있으면 빈 배열 — 우측 컬럼엔 토글만 남는다.
 */
import { getChannel, getChannelContents } from './arena.js';
import { classifyBlock } from './images.js';
import { siteLinkSchema, type SiteLink } from './schema.js';
import { ARENA_LINKS_CHANNEL } from './config.js';

export async function buildLinks(): Promise<SiteLink[]> {
  const ch = await getChannel(ARENA_LINKS_CHANNEL);
  if (!ch) {
    console.warn(`links: channel "${ARENA_LINKS_CHANNEL}" not found — 수집 링크 없이 진행.`);
    return [];
  }
  const blocks = await getChannelContents(ch.id);
  const out: SiteLink[] = [];
  for (const b of blocks) {
    const c = classifyBlock(b);
    if (c.kind !== 'link') continue;
    const parsed = siteLinkSchema.safeParse({
      url: c.url,
      title: c.title,
      description: c.description,
    });
    if (!parsed.success) {
      console.warn(`links: block ${b?.id} schema validation failed — skipped`);
      continue;
    }
    out.push(parsed.data);
  }
  return out;
}
