/**
 * 메모 — Are.na `memo` 채널 (텍스트 블록 1개 = 메모 1개).
 *
 * 좌측 컬럼 아코디언: 접힌 라벨 = 본문 첫 문장(블록 title 무시, 60자 말줄임),
 * 펼치면 본문을 서식 없이 있는 그대로(plain text, 줄바꿈 유지) 표시.
 * 수집 시각·추가한 사람을 함께 담는다. 채널 순서 그대로.
 */
import { tryGetChannelContents, blockAddedAt, blockAddedBy } from './arena.js';
import { classifyBlock } from './images.js';
import { firstSentence } from './links.js';
import { memoSchema, type Memo } from './schema.js';
import { ARENA_MEMO_CHANNEL } from './config.js';

const LABEL_MAX = 60;

/** 라벨 — 본문 첫 문장. 너무 길면 말줄임. (마크다운 기호는 걷어냄) */
function memoLabel(raw: string): string {
  const plain = raw
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/[*_`>]/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  const s = firstSentence(plain);
  return s.length > LABEL_MAX ? s.slice(0, LABEL_MAX) + '…' : s;
}

export async function buildMemos(): Promise<Memo[]> {
  const blocks = await tryGetChannelContents(ARENA_MEMO_CHANNEL);
  if (!blocks) {
    console.warn(`memo: channel "${ARENA_MEMO_CHANNEL}" not found — 메모 없이 진행.`);
    return [];
  }
  const out: Memo[] = [];
  for (const b of blocks) {
    const c = classifyBlock(b);
    if (c.kind !== 'text') continue;
    const text = c.content.trim();
    if (!text) continue;
    const parsed = memoSchema.safeParse({
      title: memoLabel(text),
      text,
      addedAt: blockAddedAt(b),
      addedBy: blockAddedBy(b),
    });
    if (!parsed.success) {
      console.warn(`memo: block ${b?.id} schema validation failed — skipped`);
      continue;
    }
    out.push(parsed.data);
  }
  return out;
}
