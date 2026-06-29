/**
 * Build-time text-channel fetch — Are.na 채널의 텍스트 블록들을 가져와
 * 각 블록의 첫 줄에서 `## ko` / `## en` 마커를 파싱한다.
 *
 *   - `## ko` 로 시작 → lang: 'ko'
 *   - `## en` 로 시작 → lang: 'en'
 *   - `## note`        → note: true (본문 아래 1단 주석)
 *   - `## note ko` / `## note en` → 주석을 언어별로 (본문처럼 ko+en 짝지음)
 *   - 셋 다 아님       → lang: null (단독, 1단으로 표시)
 *
 * 마커 줄은 본문 HTML에서 제거된다. 페이지 단에서 ko 다음 en이 연속되면
 * 좌우 2단으로 짝짓고, 그 외엔 1단으로 렌더.
 */
import { tryGetChannelContents } from './arena.js';
import { classifyBlock } from './images.js';
import { markdownToHtml } from './body.js';
import { ARENA_INTRO_CHANNEL } from "./config.js";

export interface TextBlock {
  /** 'ko' | 'en' | null */
  lang: 'ko' | 'en' | null;
  /** marked로 변환된 HTML */
  html: string;
  /** `## note` 마커 블록 — 2단 본문이 아니라 본문 아래 1단 주석으로 렌더. */
  note?: boolean;
}

// `## ko` | `## en` | `## note` | `## note ko` | `## note en`
const MARKER_RE = /^\s*##\s*(?:(note)(?:\s+(ko|en))?|(ko|en))\s*$/i;

export function parseMarker(
  markdown: string,
): { lang: 'ko' | 'en' | null; note: boolean; rest: string } {
  const lines = markdown.split(/\r?\n/);
  const m = MARKER_RE.exec(lines[0] ?? '');
  if (m) {
    const note = !!m[1]; // 'note' 캡처됨
    const langTag = (note ? m[2] : m[3])?.toLowerCase(); // note면 뒤 언어, 아니면 ko/en
    return {
      lang: langTag === 'ko' || langTag === 'en' ? (langTag as 'ko' | 'en') : null,
      note,
      rest: lines.slice(1).join('\n').trimStart(),
    };
  }
  return { lang: null, note: false, rest: markdown };
}

async function buildTextChannel(slug: string, label: string): Promise<TextBlock[]> {
  // contents를 바로 친다 — 존재 확인용 getChannel 요청 1회 절약 (404/403 → null)
  const blocks = await tryGetChannelContents(slug);
  if (!blocks) {
    console.warn(`${label}: channel "${slug}" not found.`);
    return [];
  }
  const out: TextBlock[] = [];
  for (const b of blocks) {
    const c = classifyBlock(b);
    if (c.kind !== 'text') continue;
    const { lang, note, rest } = parseMarker(c.content);
    if (!rest.trim()) continue;
    out.push({
      lang,
      note,
      html: markdownToHtml(rest, `${label} block ${out.length + 1}`),
    });
  }
  return out;
}

export function buildIntro() {
  return buildTextChannel(ARENA_INTRO_CHANNEL, 'intro');
}
