/**
 * 수집 링크 — Are.na `links` 채널 (링크 블록 1개 = 사이트 1개).
 *
 * 우측 컬럼에 채널 순서대로 쌓이는 사이트 컬렉션. Are.na에 링크 블록을
 * 추가하면 다음 빌드에 반영된다. 블록 title이 표시 이름 (없으면 URL).
 * 채널이 없거나 비어 있으면 빈 배열 — 우측 컬럼엔 토글만 남는다.
 */
import { tryGetChannelContents, parseDescriptionMetadata, blockAddedAt, parseTags } from "./arena.js";
import { classifyBlock } from './images.js';
import { siteLinkSchema, type SiteLink } from './schema.js';
import { ARENA_LINKS_CHANNEL } from './config.js';

/**
 * 설명은 첫 문장만 — 마침표류(.!?…) 뒤에 공백/끝이 오는 지점까지.
 * "Are.na"처럼 단어 안의 점(뒤에 공백 없음)은 문장 끝으로 안 본다.
 * 줄바꿈·연속 공백은 한 칸으로 정리.
 */
export function firstSentence(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  const m = t.match(/^.*?[.!?…](?=\s|$)/);
  return (m ? m[0] : t).trim();
}

/**
 * 제목·설명 수동 지정 — 블록 description에 사이트 표준 key: value DSL.
 *
 *   title: 내가 정한 제목
 *   desc: 내가 쓴 한 줄 설명
 *
 * 키가 하나라도 있으면 수동 모드: 스크랩된 설명은 무시하고 meta만 쓴다
 * (title만 쓰면 설명 없음 = 자동 설명 끄기). 키가 없으면 자동 모드:
 * 블록 title + 스크랩 설명의 첫 문장.
 */
export function deriveLink(
  blockTitle: string,
  blockDescription: string,
): { title: string; description: string } {
  const meta = parseDescriptionMetadata(blockDescription);
  const manual = 'title' in meta || 'desc' in meta;
  return {
    title: (meta.title || blockTitle || '').trim(),
    description: manual ? (meta.desc || '').trim() : firstSentence(blockDescription),
  };
}

export async function buildLinks(): Promise<SiteLink[]> {
  // contents를 바로 친다 — 존재 확인용 getChannel 요청 1회 절약 (404/403 → null)
  const blocks = await tryGetChannelContents(ARENA_LINKS_CHANNEL);
  if (!blocks) {
    console.warn(`links: channel "${ARENA_LINKS_CHANNEL}" not found — 수집 링크 없이 진행.`);
    return [];
  }
  const out: SiteLink[] = [];
  for (const b of blocks) {
    const c = classifyBlock(b);
    if (c.kind !== 'link') continue;
    const d = deriveLink(c.title, c.description);
    const parsed = siteLinkSchema.safeParse({
      url: c.url,
      title: d.title,
      description: d.description,
      addedAt: blockAddedAt(b),
      tags: parseTags(parseDescriptionMetadata(c.description).tags),
    });
    if (!parsed.success) {
      console.warn(`links: block ${b?.id} schema validation failed — skipped`);
      continue;
    }
    out.push(parsed.data);
  }
  return out;
}
