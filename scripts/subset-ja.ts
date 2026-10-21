/**
 * 일본어 서브셋 폰트 — 빌드 산출물 `public/fonts/IBMPlexSansJP-subset.woff2`.
 *
 * Heitz엔 가나·한자가 없어 일본어는 IBM Plex Sans JP가 그린다. 원본은
 * 수 MB라 그대로 쓰면 첫 페인트가 무너지므로, 스냅샷에 실제로 등장하는 일본어
 * 글자 + 기본 가나·CJK 구두점·전각 기호만 남긴 Regular 서브셋을 굽는다.
 *
 * 원본 폰트는 `.cache/fonts/`에 캐시한다(있으면 다시 받지 않음). 다운로드나
 * 서브셋이 실패하면 경고만 내고 끝난다 — 빌드는 계속되고 일본어는 시스템
 * 폴백 폰트로 그려진다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const SNAPSHOTS = ['src/data/works.json', 'src/data/memos.json', 'src/data/intro.json'];
const FONT_URL =
  'https://github.com/google/fonts/raw/main/ofl/ibmplexsansjp/IBMPlexSansJP-Regular.ttf';
const FONT_CACHE = '.cache/fonts/IBMPlexSansJP-Regular.ttf';
const OUT_FILE = 'public/fonts/IBMPlexSansJP-subset.woff2';

/** ja 본문이 담기는 스냅샷 키 — 이 값들의 글자만 서브셋에 넣는다. */
const JA_KEYS = ['titleJa', 'bodyJa', 'textJa'];
/** 스냅샷 밖에서 화면에 나가는 일본어 — 자동번역 표기. */
const EXTRA_CHARS = '自動翻訳';
/** 통째로 넣는 구간 — 실제로 쓰는 글자만 골라내면 조판용 기호가 빠진다. */
const RANGES: [number, number][] = [
  [0x3000, 0x303f], // CJK 구두점 (、。「」 등)
  [0x3040, 0x30ff], // 히라가나·가타카나
  [0xff00, 0xffef], // 전각 기호·반각 가타카나
];

/** 스냅샷 JSON을 훑어 ja 문자열만 모은다 (intro 블록은 lang === 'ja'의 html). */
function collectJaText(node: unknown, out: string[]): void {
  if (Array.isArray(node)) {
    for (const item of node) collectJaText(item, out);
    return;
  }
  if (!node || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;
  for (const key of JA_KEYS) {
    if (typeof obj[key] === 'string') out.push(obj[key] as string);
  }
  if (obj.lang === 'ja' && typeof obj.html === 'string') out.push(obj.html);
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') collectJaText(value, out);
  }
}

function charset(): string {
  const chars = new Set<string>();
  for (const file of SNAPSHOTS) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    const texts: string[] = [];
    try {
      collectJaText(JSON.parse(readFileSync(path, 'utf8')), texts);
    } catch (err: any) {
      console.warn(`  ⚠ subset-ja: ${file} 읽기 실패 (${err.message})`);
      continue;
    }
    // HTML 태그는 글자가 아니다 — 떼고 나서 모은다.
    for (const text of texts) {
      for (const ch of text.replace(/<[^>]*>/g, ' ')) chars.add(ch);
    }
  }
  for (const ch of EXTRA_CHARS) chars.add(ch);
  for (const [from, to] of RANGES) {
    for (let cp = from; cp <= to; cp++) chars.add(String.fromCodePoint(cp));
  }
  return [...chars].join('');
}

async function fontBuffer(): Promise<Buffer> {
  const cached = resolve(process.cwd(), FONT_CACHE);
  if (existsSync(cached)) return readFileSync(cached);
  const res = await fetch(FONT_URL);
  if (!res.ok) throw new Error(`폰트 다운로드 실패 (HTTP ${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(cached), { recursive: true });
  writeFileSync(cached, buf);
  return buf;
}

async function main(): Promise<void> {
  try {
    const text = charset();
    const font = await fontBuffer();
    const { default: subsetFont } = await import('subset-font');
    const woff2 = await subsetFont(font, text, { targetFormat: 'woff2' });
    const out = resolve(process.cwd(), OUT_FILE);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, woff2);
    console.log(`  subset-ja: ${text.length}자 → ${OUT_FILE} (${Math.round(woff2.length / 1024)}KB)`);
  } catch (err: any) {
    console.warn(`  ⚠ subset-ja: ${err.message} — 일본어 폰트 서브셋 생략(시스템 폴백)`);
  }
}

main();
