/**
 * Download Are.na image blocks to local assets so the build never depends on
 * remote URLs staying alive, and so Astro's image pipeline can process them.
 *
 * Files land in `src/assets/works/<slug>/NNNN.<ext>`. Already-downloaded files
 * are skipped (simple content cache keyed by filename).
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { ASSETS_WORKS_DIR } from './config.js';
import type { WorkImage } from './schema.js';

/** Pull the best available image URL out of an Are.na block, or null. */
export function imageUrlFromBlock(block: any): string | null {
  const img = block?.image;
  const candidates = [
    img?.original?.url,
    img?.large?.url,
    img?.display?.url,
    block?.attachment?.url,
    block?.source?.url,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && /^https?:\/\//.test(c)) return c;
  }
  return null;
}

function extFromUrl(url: string): string {
  const clean = url.split('?')[0];
  const m = clean.match(/\.(jpe?g|png|gif|webp|avif|tiff?)$/i);
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export interface BlockImage {
  url: string;
  alt: string;
  caption: string;
}

/**
 * Download all images for one work. Returns the validated image descriptors
 * (paths relative to `src/assets`) in input order. Individual download
 * failures are logged and skipped — they never abort the build.
 */
export async function downloadImages(
  slug: string,
  blocks: BlockImage[],
): Promise<{ images: WorkImage[]; downloaded: number; skipped: number; failed: number }> {
  const dir = join(ASSETS_WORKS_DIR, slug);
  await mkdir(dir, { recursive: true });

  const images: WorkImage[] = [];
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  let i = 0;
  for (const b of blocks) {
    i++;
    const name = `${String(i).padStart(4, '0')}.${extFromUrl(b.url)}`;
    const filePath = join(dir, name);
    const localPath = `works/${slug}/${name}`;
    try {
      if (await exists(filePath)) {
        skipped++;
      } else {
        const res = await fetch(b.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        await writeFile(filePath, buf);
        downloaded++;
      }
      images.push({ localPath, alt: b.alt ?? '', caption: b.caption ?? '' });
    } catch (err: any) {
      failed++;
      console.warn(`  ⚠ image ${b.url} → ${localPath} failed: ${err.message}`);
    }
  }

  return { images, downloaded, skipped, failed };
}
