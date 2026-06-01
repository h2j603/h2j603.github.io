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
import { worksFileSchema, type Work } from './schema.js';

const DATA_PATH = resolve(process.cwd(), 'src/data/works.json');

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

// Eagerly import every downloaded image so we can map a work's localPath to an
// optimisable Astro asset.
const imageModules = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/works/**/*.{jpg,jpeg,png,gif,webp,avif,tif,tiff}',
  { eager: true },
);

export function resolveImage(localPath: string): ImageMetadata | undefined {
  return imageModules[`/src/assets/${localPath}`]?.default;
}
