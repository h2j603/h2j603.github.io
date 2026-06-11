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
  peopleFileSchema,
  type Work,
  type SiteLink,
  type Person,
} from './schema.js';

const DATA_PATH = resolve(process.cwd(), 'src/data/works.json');
const INTRO_PATH = resolve(process.cwd(), 'src/data/intro.json');
const FOOTER_PATH = resolve(process.cwd(), 'src/data/footer.json');
const LINKS_PATH = resolve(process.cwd(), 'src/data/links.json');
const PEOPLE_PATH = resolve(process.cwd(), 'src/data/people.json');

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
  introCache = groupBilingual(readBlocks(INTRO_PATH));
  return introCache;
}

let footerCache: BilingualGroup[] | null = null;
export function getFooter(): BilingualGroup[] {
  if (footerCache !== null) return footerCache;
  footerCache = groupBilingual(readBlocks(FOOTER_PATH));
  return footerCache;
}

/** 좌측 컬럼 인물 인덱스 — people.json 스냅샷 (없으면 빈 배열). */
let peopleCache: Person[] | null = null;
export function getPeople(): Person[] {
  if (peopleCache !== null) return peopleCache;
  try {
    peopleCache = peopleFileSchema.parse(JSON.parse(readFileSync(PEOPLE_PATH, 'utf8')));
  } catch {
    peopleCache = [];
  }
  return peopleCache;
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
