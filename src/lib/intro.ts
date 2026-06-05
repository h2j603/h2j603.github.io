/**
 * Build-time text-channel fetch — Are.na 채널의 텍스트 블록들을 가져와
 * 각 블록의 첫 줄에서 `## ko` / `## en` 마커를 파싱한다.
 *
 *   - `## ko` 로 시작 → lang: 'ko'
 *   - `## en` 로 시작 → lang: 'en'
 *   - 둘 다 아님       → lang: null (단독, 1단으로 표시)
 *
 * 마커 줄은 본문 HTML에서 제거된다. 페이지 단에서 ko 다음 en이 연속되면
 * 좌우 2단으로 짝짓고, 그 외엔 1단으로 렌더.
 */
import { getChannel, getChannelContents } from './arena.js';
import { classifyBlock } from './images.js';
import { markdownToHtml } from './body.js';
import { ARENA_INTRO_CHANNEL, ARENA_FOOTER_CHANNEL } from './config.js';

export interface TextBlock {
  /** 'ko' | 'en' | null */
  lang: 'ko' | 'en' | null;
  /** marked로 변환된 HTML */
  html: string;
}

const MARKER_RE = /^\s*##\s*(ko|en)\s*$/i;

export function parseMarker(markdown: string): { lang: 'ko' | 'en' | null; rest: string } {
  const lines = markdown.split(/\r?\n/);
  const m = MARKER_RE.exec(lines[0] ?? '');
  if (m) {
    return {
      lang: m[1].toLowerCase() as 'ko' | 'en',
      rest: lines.slice(1).join('\n').trimStart(),
    };
  }
  return { lang: null, rest: markdown };
}

async function buildTextChannel(slug: string, label: string): Promise<TextBlock[]> {
  const ch = await getChannel(slug);
  if (!ch) {
    console.warn(`${label}: channel "${slug}" not found.`);
    return [];
  }
  const blocks = await getChannelContents(ch.id);
  const out: TextBlock[] = [];
  for (const b of blocks) {
    const c = classifyBlock(b);
    if (c.kind !== 'text') continue;
    const { lang, rest } = parseMarker(c.content);
    if (!rest.trim()) continue;
    out.push({
      lang,
      html: markdownToHtml(rest, `${label} block ${out.length + 1}`),
    });
  }
  return out;
}

export function buildIntro() {
  return buildTextChannel(ARENA_INTRO_CHANNEL, 'intro');
}

export function buildFooter() {
  return buildTextChannel(ARENA_FOOTER_CHANNEL, 'footer');
}
