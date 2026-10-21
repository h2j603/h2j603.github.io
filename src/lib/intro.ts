/**
 * Build-time text-channel fetch — Are.na 채널의 텍스트 블록들을 가져와
 * 각 블록의 첫 줄에서 `## ko` / `## en` 마커를 파싱한다.
 *
 *   - `## ko` 로 시작 → lang: 'ko'
 *   - `## en` 로 시작 → lang: 'en'
 *   - `## ja` 로 시작 → lang: 'ja'
 *   - `## note`        → note: true (본문 아래 1단 주석)
 *   - `## note ko` / `## note en` / `## note ja` → 주석을 언어별로 (본문처럼 짝지음)
 *   - 셋 다 아님       → lang: null (단독, 1단으로 표시)
 *
 * 마커 줄은 본문 HTML에서 제거된다. 페이지 단에서 ko 다음 en이 연속되면
 * 좌우 2단으로 짝짓고, ja는 그 짝과 독립 1단으로 렌더.
 */
import { tryGetChannelContents } from './arena.js';
import { classifyBlock } from './images.js';
import { markdownToHtml } from './body.js';
import { translateTo } from './translate.js';
import { ARENA_INTRO_CHANNEL } from "./config.js";

export interface TextBlock {
  /** 'ko' | 'en' | 'ja' | null */
  lang: 'ko' | 'en' | 'ja' | null;
  /** marked로 변환된 HTML */
  html: string;
  /** `## note` 마커 블록 — 2단 본문이 아니라 본문 아래 1단 주석으로 렌더. */
  note?: boolean;
  /** ja 블록이 자동번역이면 true — About의 「自動翻訳」 표기용. */
  auto?: boolean;
}

// `## ko` | `## en` | `## ja` | `## note` | `## note ko` | `## note en` | `## note ja`
const MARKER_RE = /^\s*##\s*(?:(note)(?:\s+(ko|en|ja))?|(ko|en|ja))\s*$/i;

export function parseMarker(
  markdown: string,
): { lang: 'ko' | 'en' | 'ja' | null; note: boolean; rest: string } {
  const lines = markdown.split(/\r?\n/);
  const m = MARKER_RE.exec(lines[0] ?? '');
  if (m) {
    const note = !!m[1]; // 'note' 캡처됨
    const langTag = (note ? m[2] : m[3])?.toLowerCase(); // note면 뒤 언어, 아니면 언어 태그
    return {
      lang: langTag === 'ko' || langTag === 'en' || langTag === 'ja' ? (langTag as 'ko' | 'en' | 'ja') : null,
      note,
      rest: lines.slice(1).join('\n').trimStart(),
    };
  }
  return { lang: null, note: false, rest: markdown };
}

/** 마커를 뗀 본문(마크다운)까지 들고 있는 중간 형태 — ja 자동번역이 원문을 쓴다. */
interface RawBlock {
  lang: 'ko' | 'en' | 'ja' | null;
  note: boolean;
  markdown: string;
}

async function buildTextChannel(slug: string, label: string): Promise<RawBlock[]> {
  // contents를 바로 친다 — 존재 확인용 getChannel 요청 1회 절약 (404/403 → null)
  const blocks = await tryGetChannelContents(slug);
  if (!blocks) {
    console.warn(`${label}: channel "${slug}" not found.`);
    return [];
  }
  const out: RawBlock[] = [];
  for (const b of blocks) {
    const c = classifyBlock(b);
    if (c.kind !== 'text') continue;
    const { lang, note, rest } = parseMarker(c.content);
    if (!rest.trim()) continue;
    out.push({ lang, note, markdown: rest });
  }
  return out;
}

export async function buildIntro(): Promise<TextBlock[]> {
  const raw = await buildTextChannel(ARENA_INTRO_CHANNEL, 'intro');
  const toBlock = (b: RawBlock, i: number, auto = false): TextBlock => ({
    lang: b.lang,
    note: b.note,
    auto,
    html: markdownToHtml(b.markdown, `intro block ${i + 1}`),
  });
  const blocks = raw.map((b, i) => toBlock(b, i));
  // ##ja 블록이 있으면 그게 정본 — 자동번역하지 않는다.
  if (raw.some((b) => b.lang === 'ja')) return blocks;

  // ##ja 블록이 없으면 ko 블록을 일본어로 번역해 ja판을 만든다 (본문·주석 각각).
  // 키 없음/실패 → ja 없음, 페이지는 ja 모드에서 한국어로 폴백. 빌드는 계속.
  const koBlocks = raw.filter((b) => b.lang === 'ko');
  const ja = await translateTo('ja', koBlocks.map((b) => b.markdown));
  ja.forEach((out, j) => {
    if (!out) return;
    blocks.push({
      lang: 'ja',
      note: koBlocks[j].note,
      auto: true,
      html: markdownToHtml(out, `intro ja block ${j + 1}`),
    });
  });
  return blocks;
}
