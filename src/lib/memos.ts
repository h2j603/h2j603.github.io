/**
 * 메모 — Are.na `memo` 채널 (텍스트 블록 1개 = 메모 1개).
 *
 * 좌측 컬럼에 아코디언으로 표시: 접힌 상태 = 라벨(블록 title, 없으면
 * 본문 첫 줄 요약), 펼치면 본문(markdown → HTML). 채널 순서 그대로.
 * 채널이 없거나 비어 있으면 빈 배열.
 */
import { tryGetChannelContents } from './arena.js';
import { classifyBlock } from './images.js';
import { markdownToHtml } from './body.js';
import { memoSchema, type Memo } from './schema.js';
import { ARENA_MEMO_CHANNEL } from './config.js';

/** 라벨 fallback — 본문 첫 줄에서 마크다운 기호를 걷어내고 40자로 자름. */
function firstLineLabel(markdown: string): string {
  const line = (markdown.split(/\r?\n/).find((l) => l.trim()) ?? '').trim();
  const plain = line
    .replace(/^#{1,6}\s*/, '')
    .replace(/[*_`>]/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .trim();
  return plain.length > 40 ? plain.slice(0, 40) + '…' : plain;
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
    const title =
      (typeof b?.title === 'string' && b.title.trim()) || firstLineLabel(c.content);
    const html = markdownToHtml(c.content, `memo block ${out.length + 1}`);
    const parsed = memoSchema.safeParse({ title, html });
    if (!parsed.success) {
      console.warn(`memo: block ${b?.id} schema validation failed — skipped`);
      continue;
    }
    out.push(parsed.data);
  }
  return out;
}
