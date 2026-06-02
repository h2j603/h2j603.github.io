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

/** The class of an Are.na block, lowercased. Spellings vary by API version. */
function blockClass(block: any): string {
  const t = block?.class ?? block?.base_class ?? block?.type;
  return typeof t === 'string' ? t.toLowerCase() : '';
}

/**
 * Best available bitmap URL on a block — the uploaded image for Image blocks,
 * or the Are.na-served preview/thumbnail for Link/Media blocks (both live under
 * the same `image.{original,large,display}` shape).
 */
function bitmapUrl(block: any): string | null {
  const img = block?.image;
  const candidates = [
    img?.original?.url,
    img?.large?.url,
    img?.display?.url,
    block?.attachment?.url,
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
 * - Image / uploaded blocks → download as artwork.
 * - Link / Media (embed) blocks → an outbound link AND its Are.na-served
 *   thumbnail (downloaded locally like any image, so the build never depends on
 *   a remote URL). A work with any link block is treated as a `web` work.
 * - Text blocks → body copy (Markdown). The 1st text block is the Korean body,
 *   the 2nd is the English body.
 * - Channel / anything else → skip.
 *
 * The class field is authoritative; we fall back to URL shape only when the
 * class is missing, so a Link block's thumbnail is never mistaken for an
 * uploaded artwork image.
 */
export function classifyBlock(block: any): BlockKind {
  const cls = blockClass(block);

  if (cls === 'link' || cls === 'media') {
    const url = block?.source?.url ?? block?.source_url ?? block?.url;
    if (typeof url === 'string' && /^https?:\/\//.test(url)) {
      return {
        kind: 'link',
        url,
        title: block?.title ?? block?.generated_title ?? '',
        description: block?.description ?? '',
        thumbnailUrl: bitmapUrl(block),
      };
    }
    return { kind: 'skip' };
  }

  if (cls === 'image' || cls === 'attachment') {
    const url = bitmapUrl(block);
    return url ? { kind: 'image', url } : { kind: 'skip' };
  }

  if (cls === 'text') {
    // Are.na stores text blocks as Markdown under `content`.
    const content = block?.content ?? block?.content_html ?? '';
    return typeof content === 'string' && content.trim()
      ? { kind: 'text', content }
      : { kind: 'skip' };
  }

  if (cls === 'channel') return { kind: 'skip' };

  // No/unknown class: only treat as image if there's a genuine uploaded image,
  // and there's no link source that would mark it as a Link block.
  if (!cls) {
    const hasLinkSource =
      typeof (block?.source?.url ?? block?.source_url) === 'string';
    const url = bitmapUrl(block);
    if (url && !hasLinkSource) return { kind: 'image', url };
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
