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
import { readMarkdown } from './arena.js';
import type { WorkImage } from './schema.js';

/**
 * Block type discriminator. Per the v3 spec, this is `block.type` and uses
 * PascalCase values: Text, Image, Link, Attachment, Embed, PendingBlock, Channel.
 */
function blockType(block: any): string {
  const t = block?.type;
  return typeof t === 'string' ? t : '';
}

/**
 * Best available bitmap URL on a block.
 *
 * `BlockImage` has `src` (original) plus `small / medium / large / square`
 * resized versions (each an `ImageVersion` with `src` and `src_2x`). For
 * download we want the highest available resolution.
 */
function bitmapUrl(block: any): string | null {
  const img = block?.image;
  if (!img) return null;
  const candidates = [
    img.src,           // BlockImage original
    img.large?.src,    // ImageVersion
    img.medium?.src,
    img.square?.src,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && /^https?:\/\//.test(c)) return c;
  }
  return null;
}

export type BlockKind =
  | { kind: 'image'; url: string }
  | { kind: 'link'; url: string; title: string; description: string; thumbnailUrl: string | null }
  | { kind: 'text'; content: string }
  | { kind: 'skip' };

/**
 * Classify a work-channel block.
 *
 * - Image → uploaded artwork (downloaded locally).
 * - Link / Embed → an outbound link AND its Are.na-served thumbnail (downloaded
 *   locally like any image, so the build never depends on a remote URL). A
 *   work with any link block is treated as a `web` work.
 * - Text → body copy (Markdown). The 1st text block is the Korean body, the
 *   2nd is the English body.
 * - Attachment / PendingBlock / Channel sub-channels / anything else → skip.
 */
export function classifyBlock(block: any): BlockKind {
  const t = blockType(block);

  if (t === 'Link' || t === 'Embed') {
    const url = block?.source?.url;
    if (typeof url === 'string' && /^https?:\/\//.test(url)) {
      const title =
        (typeof block?.title === 'string' && block.title) ||
        (typeof block?.source?.title === 'string' && block.source.title) ||
        '';
      return {
        kind: 'link',
        url,
        title,
        description: readMarkdown(block?.description),
        thumbnailUrl: bitmapUrl(block),
      };
    }
    return { kind: 'skip' };
  }

  if (t === 'Image') {
    const url = bitmapUrl(block);
    return url ? { kind: 'image', url } : { kind: 'skip' };
  }

  if (t === 'Text') {
    const content = readMarkdown(block?.content);
    return content.trim() ? { kind: 'text', content } : { kind: 'skip' };
  }

  return { kind: 'skip' };
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

export interface DownloadStats {
  downloaded: number;
  skipped: number;
  failed: number;
}

/**
 * Download one URL into `src/assets/works/<slug>/<basename>.<ext>` (skip-cached
 * by filename). Returns the path relative to `src/assets`, or null on failure.
 * Mutates `stats` so callers can aggregate a per-work summary.
 */
export async function downloadFile(
  slug: string,
  url: string,
  basename: string,
  stats: DownloadStats,
): Promise<string | null> {
  const dir = join(ASSETS_WORKS_DIR, slug);
  await mkdir(dir, { recursive: true });
  const name = `${basename}.${extFromUrl(url)}`;
  const filePath = join(dir, name);
  const localPath = `works/${slug}/${name}`;
  try {
    if (await exists(filePath)) {
      stats.skipped++;
    } else {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await writeFile(filePath, Buffer.from(await res.arrayBuffer()));
      stats.downloaded++;
    }
    return localPath;
  } catch (err: any) {
    stats.failed++;
    console.warn(`  ⚠ ${url} → ${localPath} failed: ${err.message}`);
    return null;
  }
}

/**
 * Download all artwork images for one work, in input order. Individual download
 * failures are logged and skipped — they never abort the build.
 */
export async function downloadImages(
  slug: string,
  blocks: BlockImage[],
  stats: DownloadStats,
): Promise<WorkImage[]> {
  const images: WorkImage[] = [];
  let i = 0;
  for (const b of blocks) {
    i++;
    const localPath = await downloadFile(slug, b.url, String(i).padStart(4, '0'), stats);
    if (localPath) images.push({ localPath, alt: b.alt ?? '', caption: b.caption ?? '' });
  }
  return images;
}
