/**
 * Page-side data access. Reads the build-time snapshot (`src/data/works.json`)
 * and resolves each work's local image files into Astro image assets.
 *
 * `import.meta.glob` is evaluated by Vite at build start; `build-data.ts` runs
 * before `astro build`, so the downloaded files already exist on disk and are
 * picked up here.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ImageMetadata } from 'astro';
import {
  worksFileSchema,
  linksFileSchema,
  memosFileSchema,
  type Work,
  type SiteLink,
  type Memo,
} from './schema.js';

const DATA_PATH = resolve(process.cwd(), 'src/data/works.json');
const INTRO_PATH = resolve(process.cwd(), 'src/data/intro.json');
const LINKS_PATH = resolve(process.cwd(), 'src/data/links.json');
const MEMOS_PATH = resolve(process.cwd(), 'src/data/memos.json');

let cache: Work[] | null = null;

export function getWorks(): Work[] {
  if (cache) return cache;
  try {
    const raw = readFileSync(DATA_PATH, 'utf8');
    cache = worksFileSchema.parse(JSON.parse(raw));
  } catch (err: any) {
    console.warn(
      `site-data: could not read ${DATA_PATH} (${err.message}). ` +
        'Run `npm run build:data`. Falling back to no works.',
    );
    cache = [];
  }
  return cache;
}

export interface TextBlock {
  lang: 'ko' | 'en' | null;
  html: string;
  /** `## note` 마커 블록 — 2단 본문이 아니라 1단 주석. */
  note?: boolean;
}
export interface BilingualGroup {
  ko?: string;
  en?: string;
}

export { groupBilingual };

function readBlocks(path: string): TextBlock[] {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return [];
  }
}

/**
 * 블록 배열을 ko/en 짝 또는 단독으로 그룹화.
 * - 현재 ko + 다음 en → 한 그룹 (좌우 2단)
 * - 그 외 → 단독 그룹 (1단)
 */
function groupBilingual(blocks: TextBlock[]): BilingualGroup[] {
  const groups: BilingualGroup[] = [];
  let i = 0;
  while (i < blocks.length) {
    const cur = blocks[i];
    const next = blocks[i + 1];
    if (cur.lang === 'ko' && next?.lang === 'en') {
      groups.push({ ko: cur.html, en: next.html });
      i += 2;
    } else if (cur.lang === 'en' && next?.lang === 'ko') {
      groups.push({ ko: next.html, en: cur.html });
      i += 2;
    } else {
      const key = cur.lang ?? 'ko';
      groups.push({ [key]: cur.html });
      i += 1;
    }
  }
  return groups;
}

let introCache: BilingualGroup[] | null = null;
export function getIntro(): BilingualGroup[] {
  if (introCache !== null) return introCache;
  // 주석(## note) 블록은 2단 본문 짝짓기에서 제외 — 본문만 좌우 2단으로.
  introCache = groupBilingual(readBlocks(INTRO_PATH).filter((b) => !b.note));
  return introCache;
}

/** About 본문 아래 1단 주석들(## note 블록의 HTML, 채널 순서). */
let introNotesCache: string[] | null = null;
export function getIntroNotes(): string[] {
  if (introNotesCache !== null) return introNotesCache;
  introNotesCache = readBlocks(INTRO_PATH).filter((b) => b.note).map((b) => b.html);
  return introNotesCache;
}

/** 우측 컬럼 수집 링크 — links.json 스냅샷 (없으면 빈 배열). */
let linksCache: SiteLink[] | null = null;
export function getLinks(): SiteLink[] {
  if (linksCache !== null) return linksCache;
  try {
    linksCache = linksFileSchema.parse(JSON.parse(readFileSync(LINKS_PATH, 'utf8')));
  } catch {
    linksCache = [];
  }
  return linksCache;
}

// Eagerly import every downloaded image so we can map a work's localPath to an
// optimisable Astro asset.
const imageModules = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/works/**/*.{jpg,jpeg,png,gif,webp,avif,tif,tiff}',
  { eager: true },
);

export function resolveImage(localPath: string): ImageMetadata | undefined {
  return imageModules[`/src/assets/${localPath}`]?.default;
}

// 영상은 이미지 파이프라인을 안 타므로 별도 glob — `?url`로 빌드된 정적 파일
// URL(문자열)을 얻어 <video src>에 그대로 쓴다.
const videoModules = import.meta.glob<string>(
  '/src/assets/works/**/*.{mp4,webm,mov,m4v,ogv}',
  { eager: true, query: '?url', import: 'default' },
);

export function resolveVideo(localPath: string): string | undefined {
  return videoModules[`/src/assets/${localPath}`];
}

/** 좌측 컬럼 메모 — memos.json 스냅샷 (없으면 빈 배열). */
let memosCache: Memo[] | null = null;
export function getMemos(): Memo[] {
  if (memosCache !== null) return memosCache;
  try {
    memosCache = memosFileSchema.parse(JSON.parse(readFileSync(MEMOS_PATH, 'utf8')));
  } catch {
    memosCache = [];
  }
  return memosCache;
}
