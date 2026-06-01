/**
 * Orchestrator: combine Are.na (structure + images + metadata) with Google Docs
 * (body text) into the validated `Work[]` that the site renders.
 *
 * Error isolation is the rule: a single bad work channel or Doc is logged and
 * skipped, never fatal. A summary is returned for the caller to print.
 */
import { getChannel, getChannelContents, getChannelMetadata } from './arena.js';
import { fetchDoc } from './docs.js';
import {
  downloadImages,
  downloadFile,
  classifyBlock,
  type BlockImage,
  type DownloadStats,
} from './images.js';
import { workSchema, TAGS, type Work, type WorkLink, type Tag } from './schema.js';
import { ARENA_INDEX_CHANNEL } from './config.js';

export interface BuildSummary {
  total: number;
  built: number;
  skippedUnpublished: number;
  failed: string[];
  warnings: string[];
}

function blockIsChannel(block: any): boolean {
  const t = block?.class ?? block?.base_class ?? block?.type;
  return typeof t === 'string' && t.toLowerCase() === 'channel';
}

/** Resolve the child channel's slug/id from an index-channel block. */
function channelRefFromBlock(block: any): string | number | null {
  return (
    block?.slug ??
    block?.channel?.slug ??
    block?.id ??
    block?.channel?.id ??
    null
  );
}

function num(
  value: string | undefined,
  fallback: number,
  warn: (m: string) => void,
  ctx: string,
): number {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  if (Number.isNaN(n)) {
    warn(`${ctx}: order "${value}" is not a number, using ${fallback}`);
    return fallback;
  }
  return n;
}

/**
 * Parse the comma-separated `tags` metadata into known tags (deduped, in input
 * order). Unknown tokens are warned about and dropped. `web` is added elsewhere
 * when the work has a link block.
 */
function parseTags(value: string | undefined, warn: (m: string) => void, ctx: string): Tag[] {
  if (!value) return [];
  const seen = new Set<Tag>();
  for (const raw of value.split(',')) {
    const t = raw.trim().toLowerCase();
    if (!t) continue;
    if ((TAGS as readonly string[]).includes(t)) seen.add(t as Tag);
    else warn(`${ctx}: unknown tag "${t}" ignored (allowed: ${TAGS.join(', ')})`);
  }
  return [...seen];
}

async function buildOne(
  ref: string | number,
  warn: (m: string) => void,
): Promise<{ work: Work | null; skipped: boolean }> {
  const channel = await getChannel(ref);
  if (!channel) {
    warn(`channel "${ref}" not found`);
    return { work: null, skipped: false };
  }
  const meta = await getChannelMetadata(channel.id);

  if (meta.published?.toLowerCase() === 'false') {
    return { work: null, skipped: true };
  }

  const slug = (meta.slug || channel.slug || '').trim();
  if (!slug) {
    warn(`channel ${channel.id} has no usable slug`);
    return { work: null, skipped: false };
  }

  const ctx = `work "${slug}"`;

  // Classify channel blocks (in channel order): images → download artwork,
  // links → outbound link + Are.na thumbnail (also downloaded locally).
  const blocks = await getChannelContents(channel.id);
  const imageBlocks: BlockImage[] = [];
  const linkBlocks: { link: Omit<WorkLink, 'thumbnail'>; thumbnailUrl: string | null }[] = [];
  for (const b of blocks) {
    const c = classifyBlock(b);
    if (c.kind === 'image') {
      imageBlocks.push({
        url: c.url,
        alt: b?.metadata?.alt ?? b?.alt ?? '',
        caption: b?.metadata?.caption ?? b?.description ?? '',
      });
    } else if (c.kind === 'link') {
      linkBlocks.push({
        link: { url: c.url, title: c.title, description: c.description },
        thumbnailUrl: c.thumbnailUrl,
      });
    }
  }

  const stats: DownloadStats = { downloaded: 0, skipped: 0, failed: 0 };
  const images = await downloadImages(slug, imageBlocks, stats);

  const links: WorkLink[] = [];
  let li = 0;
  for (const { link, thumbnailUrl } of linkBlocks) {
    li++;
    let thumbnail = '';
    if (thumbnailUrl) {
      const local = await downloadFile(slug, thumbnailUrl, `link-${String(li).padStart(4, '0')}`, stats);
      if (local) thumbnail = local;
    }
    links.push({ ...link, thumbnail });
  }

  // A work with any link block is a `web` work.
  const tags = parseTags(meta.tags, warn, ctx);
  if (links.length && !tags.includes('web')) tags.push('web');

  if (stats.downloaded || stats.skipped || stats.failed || links.length) {
    console.log(
      `  ${slug}: images +${stats.downloaded} cached:${stats.skipped} failed:${stats.failed} links:${links.length} tags:[${tags.join(',')}]`,
    );
  }

  // Body from Google Docs (optional).
  let bodyKo = '';
  let bodyEn = '';
  const docId = meta.doc_id?.trim();
  if (docId && !/placeholder|replace_with/i.test(docId)) {
    try {
      ({ bodyKo, bodyEn } = await fetchDoc(docId));
    } catch (err: any) {
      warn(`${ctx}: Doc ${docId} failed: ${err.message}`);
    }
  }

  const parsed = workSchema.safeParse({
    slug,
    title: meta.title || channel.title || slug,
    year: meta.year ?? '',
    medium: meta.medium ?? '',
    size: meta.size ?? '',
    client: meta.client ?? '',
    order: num(meta.order, 9999, warn, ctx),
    tags,
    bodyKo,
    bodyEn,
    images,
    links,
  });
  if (!parsed.success) {
    warn(`${ctx}: schema validation failed: ${parsed.error.message}`);
    return { work: null, skipped: false };
  }
  return { work: parsed.data, skipped: false };
}

export async function buildWorks(): Promise<{ works: Work[]; summary: BuildSummary }> {
  const warnings: string[] = [];
  const warn = (m: string) => {
    warnings.push(m);
    console.warn(`  ⚠ ${m}`);
  };

  const index = await getChannel(ARENA_INDEX_CHANNEL);
  if (!index) {
    throw new Error(
      `Index channel "${ARENA_INDEX_CHANNEL}" not found. Run \`npm run setup:arena\` first or check ARENA_INDEX_CHANNEL.`,
    );
  }
  console.log(`Index channel: ${index.title} (#${index.id}, slug=${index.slug})`);

  const indexBlocks = await getChannelContents(index.id);
  const refs: (string | number)[] = [];
  for (const b of indexBlocks) {
    if (!blockIsChannel(b)) continue;
    const ref = channelRefFromBlock(b);
    if (ref != null) refs.push(ref);
  }
  console.log(`Found ${refs.length} work channel(s) in the index.`);

  const works: Work[] = [];
  const failed: string[] = [];
  let skippedUnpublished = 0;

  for (const ref of refs) {
    try {
      const { work, skipped } = await buildOne(ref, warn);
      if (skipped) skippedUnpublished++;
      else if (work) works.push(work);
      else failed.push(String(ref));
    } catch (err: any) {
      failed.push(String(ref));
      warn(`channel "${ref}" crashed: ${err.message}`);
    }
  }

  works.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));

  return {
    works,
    summary: {
      total: refs.length,
      built: works.length,
      skippedUnpublished,
      failed,
      warnings,
    },
  };
}
