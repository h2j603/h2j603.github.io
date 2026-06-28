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
  | { kind: 'video'; url: string; posterUrl: string | null }
  | { kind: 'link'; url: string; title: string; description: string; thumbnailUrl: string | null }
  | { kind: 'text'; content: string }
  | { kind: 'skip' };

/** 영상 파일 확장자 (Are.na Attachment로 직접 올린 mp4 등). */
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv)$/i;

/**
 * Attachment 블록이 영상 파일이면 그 URL을 돌려준다.
 * Are.na에 직접 올린 영상은 `type: 'Attachment'` + `attachment.{url, content_type}`로
 * 들어온다. content_type이 video/* 거나 URL 확장자가 영상이면 영상으로 본다.
 */
function videoAttachmentUrl(block: any): string | null {
  const att = block?.attachment;
  const url = att?.url;
  if (typeof url !== 'string' || !/^https?:\/\//.test(url)) return null;
  const ct = typeof att?.content_type === 'string' ? att.content_type : '';
  if (/^video\//i.test(ct) || VIDEO_EXT.test(url.split('?')[0])) return url;
  return null;
}

/**
 * Classify a work-channel block.
 *
 * - Image → uploaded artwork (downloaded locally).
 * - Link / Embed → an outbound link AND its Are.na-served thumbnail (downloaded
 *   locally like any image, so the build never depends on a remote URL). A
 *   work with any link block is treated as a `web` work.
 * - Text → body copy (Markdown). The 1st text block is the Korean body, the
 *   2nd is the English body.
 * - Attachment(영상) → 직접 올린 mp4 등. 영상으로 다운로드 후 <video>로 렌더.
 * - 그 외 Attachment / PendingBlock / Channel sub-channels / anything else → skip.
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

  // 직접 올린 영상 (Attachment). 포스터는 Are.na가 만든 미리보기 이미지(block.image).
  if (t === 'Attachment') {
    const url = videoAttachmentUrl(block);
    return url ? { kind: 'video', url, posterUrl: bitmapUrl(block) } : { kind: 'skip' };
  }

  if (t === 'Text') {
    const content = readMarkdown(block?.content);
    return content.trim() ? { kind: 'text', content } : { kind: 'skip' };
  }

  return { kind: 'skip' };
}

function extFromUrl(url: string): string {
  const clean = url.split('?')[0];
  const m = clean.match(/\.(jpe?g|png|gif|webp|avif|tiff?|mp4|webm|mov|m4v|ogv)$/i);
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
  /** 'video'면 영상으로 다운로드하고 포스터도 받는다. 없으면 'image'. */
  kind?: 'image' | 'video';
  /** video일 때 포스터 이미지 URL (Are.na 미리보기). 없으면 null. */
  posterUrl?: string | null;
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
 * Download all artwork media (images + videos) for one work, in input order.
 * 영상은 파일을 받고, 포스터(첫 프레임 미리보기)가 있으면 함께 받는다. 개별
 * 다운로드 실패는 로그만 남기고 건너뛴다 — 빌드를 멈추지 않는다.
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
    const base = String(i).padStart(4, '0');
    const localPath = await downloadFile(slug, b.url, base, stats);
    if (!localPath) continue;
    if (b.kind === 'video') {
      let poster = '';
      if (b.posterUrl) {
        const p = await downloadFile(slug, b.posterUrl, `${base}-poster`, stats);
        if (p) poster = p;
      }
      images.push({ localPath, alt: b.alt ?? '', caption: b.caption ?? '', kind: 'video', poster });
    } else {
      images.push({ localPath, alt: b.alt ?? '', caption: b.caption ?? '', kind: 'image', poster: '' });
    }
  }
  return images;
}
