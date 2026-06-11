/**
 * Orchestrator: turn each Are.na work channel (images + link blocks + text
 * blocks + description metadata) into the validated `Work[]` that the site
 * renders. Are.na is the only backend.
 *
 * Error isolation is the rule: a single bad work channel is logged and skipped,
 * never fatal. A summary is returned for the caller to print.
 */
import {
  getChannel,
  getChannelContents,
  parseDescriptionMetadata,
  readMarkdown,
} from './arena.js';
import { markdownToHtml } from './body.js';
import { parseMarker } from './intro.js';
import {
  downloadImages,
  downloadFile,
  classifyBlock,
  type BlockImage,
  type DownloadStats,
} from './images.js';
import { workSchema, TAGS, type Work, type WorkLink, type Tag, type Person } from './schema.js';
import { buildMentionIndex, rewriteMentions } from './people.js';
import { ARENA_INDEX_CHANNEL } from './config.js';

export interface BuildSummary {
  total: number;
  built: number;
  skippedUnpublished: number;
  failed: string[];
  warnings: string[];
}

function blockIsChannel(block: any): boolean {
  // Per the v3 spec, a sub-channel appears in channel contents as a Channel
  // object with `type: 'Channel'`.
  return block?.type === 'Channel';
}

/** Resolve the child channel's slug/id from an index-channel entry. */
function channelRefFromBlock(block: any): string | number | null {
  return block?.slug ?? block?.id ?? null;
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

/**
 * 이미지 그리드 레이아웃 파싱.
 * `layout: 2,1,3` → [2, 1, 3]. 합이 imageCount와 일치해야 적용됨.
 * 일치 안 하면 경고 + 빈 배열 반환 (기본 1단 stack으로 fallback).
 */
function parseLayout(
  value: string | undefined,
  imageCount: number,
  warn: (m: string) => void,
  ctx: string,
): number[] {
  if (!value) return [];
  const cols = value
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => parseInt(t, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (cols.length === 0) return [];
  const sum = cols.reduce((a, b) => a + b, 0);
  if (sum !== imageCount) {
    warn(`${ctx}: layout "${value}" sum=${sum} ≠ images=${imageCount} — ignored`);
    return [];
  }
  return cols;
}

async function buildOne(
  ref: string | number,
  warn: (m: string) => void,
  mentionIndex: Map<string, Person>,
): Promise<{ work: Work | null; skipped: boolean }> {
  const channel = await getChannel(ref);
  if (!channel) {
    warn(`channel "${ref}" not found`);
    return { work: null, skipped: false };
  }
  const meta = parseDescriptionMetadata(channel.description);

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
  const textBlocks: { lang: 'ko' | 'en' | null; markdown: string }[] = [];
  for (const b of blocks) {
    const c = classifyBlock(b);
    if (c.kind === 'image') {
      imageBlocks.push({
        url: c.url,
        alt:
          (typeof b?.image?.alt_text === 'string' && b.image.alt_text) ||
          (typeof b?.title === 'string' && b.title) ||
          '',
        caption: readMarkdown(b?.description),
      });
    } else if (c.kind === 'link') {
      linkBlocks.push({
        link: { url: c.url, title: c.title, description: c.description },
        thumbnailUrl: c.thumbnailUrl,
      });
    } else if (c.kind === 'text') {
      const { lang, rest } = parseMarker(c.content);
      if (rest.trim()) textBlocks.push({ lang, markdown: rest });
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

  // Representative image for index thumbnails: `cover` metadata (1-based) →
  // else first image → else first link thumbnail.
  let cover = '';
  if (images.length) {
    let idx = 0;
    if (meta.cover != null && meta.cover !== '') {
      const c = Number(meta.cover);
      if (!Number.isInteger(c) || c < 1 || c > images.length) {
        warn(`${ctx}: cover "${meta.cover}" out of range (1–${images.length}), using first image`);
      } else {
        idx = c - 1;
      }
    }
    cover = images[idx].localPath;
  } else {
    cover = links.find((l) => l.thumbnail)?.thumbnail ?? '';
  }

  // 텍스트 블록들을 HTML로 변환 (마커 분류는 이미 됨). 채널 순서 보존.
  // @멘션은 인물 레지스트리와 매칭해 재작성 — 블록 언어에 맞는 이름·대표 URL로
  // 통일하고, 매칭된 슬러그를 work.people(관계형 조인 키)로 수집한다.
  const matchedPeople = new Set<string>();
  const bodyBlocks = textBlocks.map((tb, i) => {
    const html = markdownToHtml(tb.markdown, `${ctx} block ${i + 1}`);
    return { lang: tb.lang, html: rewriteMentions(html, tb.lang, mentionIndex, matchedPeople) };
  });
  // 호환: bodyKo/En은 마커 매칭 블록들을 join (라이브러리 등 외부 쓰임 대비).
  const bodyKo = bodyBlocks.filter((b) => b.lang === 'ko').map((b) => b.html).join('\n');
  const bodyEn = bodyBlocks.filter((b) => b.lang === 'en').map((b) => b.html).join('\n');

  if (
    stats.downloaded ||
    stats.skipped ||
    stats.failed ||
    links.length ||
    textBlocks.length
  ) {
    console.log(
      `  ${slug}: images +${stats.downloaded} cached:${stats.skipped} failed:${stats.failed} links:${links.length} text:${textBlocks.length} tags:[${tags.join(',')}]`,
    );
  }

  // 채널 이름 "한국어 / English" 형식이면 split. '/' 없으면 둘 다 같은 값.
  // channel.title을 우선해야 채널 이름 변경이 즉시 반영됨.
  const rawTitle = channel.title || meta.title || slug;
  const slashIdx = rawTitle.indexOf('/');
  const titleKo = (slashIdx >= 0 ? rawTitle.slice(0, slashIdx) : rawTitle).trim();
  const titleEn = (slashIdx >= 0 ? rawTitle.slice(slashIdx + 1) : rawTitle).trim();

  const parsed = workSchema.safeParse({
    slug,
    title: titleKo,
    titleEn,
    year: meta.year ?? '',
    medium: meta.medium ?? '',
    size: meta.size ?? '',
    client: meta.client ?? '',
    order: num(meta.order, 9999, warn, ctx),
    tags,
    cover,
    bodyKo,
    bodyEn,
    bodyBlocks,
    images,
    imageLayout: parseLayout(meta.layout, images.length, warn, ctx),
    links,
    people: [...matchedPeople],
  });
  if (!parsed.success) {
    warn(`${ctx}: schema validation failed: ${parsed.error.message}`);
    return { work: null, skipped: false };
  }
  return { work: parsed.data, skipped: false };
}

export async function buildWorks(
  people: Person[] = [],
): Promise<{ works: Work[]; summary: BuildSummary }> {
  const warnings: string[] = [];
  const warn = (m: string) => {
    warnings.push(m);
    console.warn(`  ⚠ ${m}`);
  };
  const mentionIndex = buildMentionIndex(people);

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
      const { work, skipped } = await buildOne(ref, warn, mentionIndex);
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
