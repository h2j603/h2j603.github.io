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

/**
 * 작품 표에 놓이는 순서 — year desc(최신 위), 같은 연도는 stable sort로
 * index 채널 순서 유지. 표(index.astro)와 /works.json이 같은 순서를 쓰도록
 * 여기서 한 번만 정의한다.
 */
export function getTableWorks(): Work[] {
  return getWorks()
    .slice()
    .sort((a, b) => {
      const ya = parseInt(a.year || '0', 10) || 0;
      const yb = parseInt(b.year || '0', 10) || 0;
      return yb - ya;
    });
}

/** 표 분류 칸(cat-tag)의 태그 순서 — 태그 전부, non-web 먼저 web은 맨 뒤. */
export function orderedTagsOf(w: Work): string[] {
  const nonWeb = w.tags.filter((x) => x !== 'web');
  return w.tags.includes('web') ? [...nonWeb, 'web'] : nonWeb;
}

export interface TextBlock {
  lang: 'ko' | 'en' | 'ja' | null;
  html: string;
  /** `## note` 마커 블록 — 2단 본문이 아니라 1단 주석. */
  note?: boolean;
  /** ja 블록이 자동번역이면 true — 「自動翻訳」 표기용. */
  auto?: boolean;
}
export interface BilingualGroup {
  ko?: string;
  en?: string;
  /** 일본어 — ko/en 짝과 무관한 독립 1단. */
  ja?: string;
  /** 위 ja가 자동번역이면 true. */
  jaAuto?: boolean;
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
 * ja는 이 짝짓기 바깥이다 — ko/en 사이에 끼어 있어도 짝을 깨지 않도록
 * 짝 판정에서 빼고, 독립 그룹으로 모아 뒤에 붙인다.
 */
function groupBilingual(blocks: TextBlock[]): BilingualGroup[] {
  const groups: BilingualGroup[] = [];
  const pairs = blocks.filter((b) => b.lang !== 'ja');
  let i = 0;
  while (i < pairs.length) {
    const cur = pairs[i];
    const next = pairs[i + 1];
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
  for (const b of blocks) {
    if (b.lang === 'ja') groups.push({ ja: b.html, jaAuto: b.auto });
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

/** About 본문 아래 주석들(## note 블록). 본문과 같은 한/영 짝짓기 —
 *  `## note ko` + `## note en` → 한 그룹(2단), 언어 없는 `## note` → 단독. */
let introNotesCache: BilingualGroup[] | null = null;
export function getIntroNotes(): BilingualGroup[] {
  if (introNotesCache !== null) return introNotesCache;
  introNotesCache = groupBilingual(readBlocks(INTRO_PATH).filter((b) => b.note));
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
