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
import { translateTo } from './translate.js';
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
  // Per the v3 spec, a sub-channel appears in channel contents as a Channel
  // object with `type: 'Channel'`.
  return block?.type === 'Channel';
}

/** 인덱스 contents의 Channel 블록에서 빌드에 필요한 메타만 추출.
    블록이 title·slug·description(메타 전문)을 동봉하므로 작품마다
    GET /channels/{id}를 또 부를 필요가 없다 (작품 수만큼 요청 절약). */
interface WorkChannelRef {
  id: number;
  slug: string;
  title: string;
  description: string;
}
function channelRefFromBlock(block: any): WorkChannelRef | null {
  if (typeof block?.id !== 'number') return null;
  return {
    id: block.id,
    slug: typeof block.slug === 'string' ? block.slug : '',
    title: typeof block.title === 'string' ? block.title : '',
    description: readMarkdown(block.description),
  };
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

/** 일본어 자동번역 대기분 — buildOne은 모으기만 하고, 번역은 풀 밖에서 한 번에. */
interface JaPending {
  /** 채널에 ##ja 블록이 하나도 없을 때 번역할 ko 블록 마크다운 (채널 순서). */
  koMarkdowns: string[];
  /** 제목 ja가 비었을 때 번역할 한국어 제목. 없으면 ''. */
  titleKo: string;
}

async function buildOne(
  channel: WorkChannelRef,
  warn: (m: string) => void,
): Promise<{ work: Work | null; skipped: boolean; ja: JaPending | null }> {
  const meta = parseDescriptionMetadata(channel.description);

  // `published: false`는 더 이상 작업을 빌드에서 제외하지 않는다 — 표에는
  // 남되 펼칠(클릭) 수 없는 잠긴 행으로 렌더된다 (페이지 쪽 처리).
  const published = meta.published?.toLowerCase() !== 'false';

  const slug = (meta.slug || channel.slug || '').trim();
  if (!slug) {
    warn(`channel ${channel.id} has no usable slug`);
    return { work: null, skipped: false, ja: null };
  }

  const ctx = `work "${slug}"`;

  // Classify channel blocks (in channel order): images → download artwork,
  // links → outbound link + Are.na thumbnail (also downloaded locally).
  const blocks = await getChannelContents(channel.id);
  const imageBlocks: BlockImage[] = [];
  const linkBlocks: { link: Omit<WorkLink, 'thumbnail'>; thumbnailUrl: string | null }[] = [];
  const textBlocks: { lang: 'ko' | 'en' | 'ja' | null; markdown: string }[] = [];
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
    } else if (c.kind === 'video') {
      // 영상도 이미지 시퀀스와 같은 미디어 흐름에 넣는다 — 채널 순서·레이아웃
      // (imageLayout)에서 한 칸을 차지하고, 페이지에서 <video>로 렌더된다.
      imageBlocks.push({
        url: c.url,
        alt: (typeof b?.title === 'string' && b.title) || '',
        caption: readMarkdown(b?.description),
        kind: 'video',
        posterUrl: c.posterUrl,
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
  // 표 썸네일은 정지 이미지여야 하므로 video면 포스터를 쓴다.
  const coverPath = (m: (typeof images)[number]): string =>
    m.kind === 'video' ? m.poster : m.localPath;
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
    } else {
      // 자동 선택: 영상보다 정지 이미지를 우선 (썸네일로 더 안전).
      const firstImg = images.findIndex((m) => m.kind !== 'video');
      if (firstImg >= 0) idx = firstImg;
    }
    cover = coverPath(images[idx]);
  } else {
    cover = links.find((l) => l.thumbnail)?.thumbnail ?? '';
  }

  // 텍스트 블록들을 HTML로 변환 (마커 분류는 이미 됨). 채널 순서 보존.
  // (인물 링크는 본문에 인라인 마크다운 링크로 직접 쓴다 — 별도 레지스트리 없음.)
  const bodyBlocks = textBlocks.map((tb, i) => {
    const html = markdownToHtml(tb.markdown, `${ctx} block ${i + 1}`);
    return { lang: tb.lang, html };
  });
  // 호환: bodyKo/En/Ja는 마커 매칭 블록들을 join (라이브러리 등 외부 쓰임 대비).
  const bodyKo = bodyBlocks.filter((b) => b.lang === 'ko').map((b) => b.html).join('\n');
  const bodyEn = bodyBlocks.filter((b) => b.lang === 'en').map((b) => b.html).join('\n');
  const bodyJa = bodyBlocks.filter((b) => b.lang === 'ja').map((b) => b.html).join('\n');

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

  // 채널 이름 "한국어 / English / 日本語" 형식이면 split.
  //   3조각 → ko / en / ja · 2조각 → ko / en (ja는 빈 값, 자동번역 대상)
  //   1조각 → 셋 다 같은 값이되 ja는 빈 값 (자동번역 대상)
  // channel.title을 우선해야 채널 이름 변경이 즉시 반영됨.
  const rawTitle = channel.title || meta.title || slug;
  const titleParts = rawTitle.split('/').map((s) => s.trim()).filter(Boolean);
  const titleKo = (titleParts[0] ?? rawTitle).trim();
  const titleEn = titleParts.length >= 2 ? titleParts[1] : titleKo;
  const titleJa = titleParts.length >= 3 ? titleParts.slice(2).join('/').trim() : '';

  // ja가 없으면 빌드가 번역해 채운다 — 여기선 대기분만 모은다(번역은 풀 밖에서).
  const hasJaBlocks = textBlocks.some((tb) => tb.lang === 'ja');
  const ja: JaPending | null =
    !hasJaBlocks || !titleJa
      ? {
          koMarkdowns: hasJaBlocks ? [] : textBlocks.filter((tb) => tb.lang === 'ko').map((tb) => tb.markdown),
          titleKo: titleJa ? '' : titleKo,
        }
      : null;

  const parsed = workSchema.safeParse({
    slug,
    title: titleKo,
    titleEn,
    titleJa,
    year: meta.year ?? '',
    medium: meta.medium ?? '',
    size: meta.size ?? '',
    client: meta.client ?? '',
    order: num(meta.order, 9999, warn, ctx),
    tags,
    published,
    cover,
    bodyKo,
    bodyEn,
    bodyJa,
    bodyBlocks,
    images,
    imageLayout: parseLayout(meta.layout, images.length, warn, ctx),
    links,
  });
  if (!parsed.success) {
    warn(`${ctx}: schema validation failed: ${parsed.error.message}`);
    return { work: null, skipped: false, ja: null };
  }
  return { work: parsed.data, skipped: false, ja };
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
  const refs: WorkChannelRef[] = [];
  for (const b of indexBlocks) {
    if (!blockIsChannel(b)) continue;
    const ref = channelRefFromBlock(b);
    if (ref != null) refs.push(ref);
  }
  console.log(`Found ${refs.length} work channel(s) in the index.`);

  const failed: string[] = [];
  let skippedUnpublished = 0;

  // 동시 4개 풀 — 직렬 fetch의 지연 합을 줄인다 (읽기 전용, 분당 한도
  // 120에 한참 못 미침). 결과는 인덱스 순서를 보존.
  const POOL = 4;
  const results: ({ work: Work | null; skipped: boolean; ja: JaPending | null } | null)[] =
    new Array(refs.length).fill(null);
  let cursor = 0;
  async function worker() {
    while (cursor < refs.length) {
      const i = cursor++;
      const ref = refs[i];
      try {
        results[i] = await buildOne(ref, warn);
      } catch (err: any) {
        results[i] = { work: null, skipped: false, ja: null };
        failed.push(ref.slug || String(ref.id));
        warn(`channel "${ref.slug || ref.id}" crashed: ${err.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(POOL, refs.length) }, worker));

  // ── 일본어 자동번역 — 풀 밖에서 대기분을 모아 한 번에 부른다 ──
  // translateTo는 캐시 파일(translations.json)을 읽고 통째로 다시 쓰므로,
  // 작업 풀 안에서 동시에 부르면 서로 덮어써 캐시가 유실된다(= 재과금).
  const jaTexts: string[] = [];
  const jaSlots: { ri: number; kind: 'body' | 'title'; idx: number }[] = [];
  results.forEach((r, ri) => {
    if (!r?.work || !r.ja) return;
    r.ja.koMarkdowns.forEach((md, idx) => {
      jaTexts.push(md);
      jaSlots.push({ ri, kind: 'body', idx });
    });
    if (r.ja.titleKo) {
      jaTexts.push(r.ja.titleKo);
      jaSlots.push({ ri, kind: 'title', idx: -1 });
    }
  });
  if (jaTexts.length) {
    const jaOut = await translateTo('ja', jaTexts);
    jaOut.forEach((out, k) => {
      if (!out) return; // 실패 → ja 빈 값, 페이지는 ja 모드에서 한국어로 폴백
      const slot = jaSlots[k];
      const work = results[slot.ri]!.work!;
      if (slot.kind === 'title') {
        work.titleJa = out;
      } else {
        // ja 블록은 항상 맨 뒤에 붙인다 — 앞의 ko↔en 짝 렌더를 깨지 않게.
        work.bodyBlocks.push({
          lang: 'ja',
          html: markdownToHtml(out, `work "${work.slug}" ja block ${slot.idx + 1}`),
        });
      }
      work.jaAuto = true;
    });
    // 번역이 붙은 작업의 bodyJa를 다시 모은다 (스키마 필드는 문자열 하나).
    results.forEach((r) => {
      if (!r?.work || !r.work.jaAuto) return;
      r.work.bodyJa = r.work.bodyBlocks.filter((b) => b.lang === 'ja').map((b) => b.html).join('\n');
    });
  }

  const works: Work[] = [];
  results.forEach((r, i) => {
    if (!r) return;
    if (r.work) {
      works.push(r.work);
      // 잠긴(미게시) 작업도 표엔 남으므로 빌드에 포함 — 카운트만 따로 집계.
      if (!r.work.published) skippedUnpublished++;
    } else if (!failed.includes(refs[i].slug || String(refs[i].id))) {
      failed.push(refs[i].slug || String(refs[i].id));
    }
  });

  // 정렬하지 않는다 — works[]는 index 채널의 블록 순서 그대로.
  // (표는 연도 desc로 stable 재정렬 → 같은 연도 안에선 이 채널 순서 유지.
  //  description의 order: 키는 정렬에서 폐기 — 순서는 Are.na에서 끌어서 조정)

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
