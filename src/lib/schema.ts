/**
 * The single source of truth for the shape of a "work", validated with zod.
 * `build-data.ts` validates every assembled work against this before writing
 * the snapshot, so the Astro pages can trust the data.
 */
import { z } from 'zod';

export const imageSchema = z.object({
  /** Path relative to `src/assets`, e.g. `works/british-poster/0001.jpg`. */
  localPath: z.string().min(1),
  alt: z.string().default(''),
  caption: z.string().default(''),
});

/**
 * A Link (or embed/Media) block from the work channel: the outbound URL + text,
 * plus the Are.na-served thumbnail downloaded locally (`thumbnail`, a path under
 * `src/assets` like images). A work with any link block is tagged `web`.
 */
export const linkSchema = z.object({
  url: z.string().url(),
  title: z.string().default(''),
  description: z.string().default(''),
  /** Local path to the downloaded thumbnail, or '' if none/failed. */
  thumbnail: z.string().default(''),
});

/** The fixed classification vocabulary (a single axis). */
export const TAGS = ['identity', 'editorial', 'poster', 'type', 'web'] as const;
export const tagSchema = z.enum(TAGS);

export const workSchema = z.object({
  slug: z.string().min(1),
  /** 한국어 제목 (채널 이름의 '/' 앞부분). */
  title: z.string().default(''),
  /** 영어 제목 (채널 이름의 '/' 뒷부분). '/' 없으면 title과 같음. */
  titleEn: z.string().default(''),
  year: z.string().default(''),
  medium: z.string().default(''),
  size: z.string().default(''),
  client: z.string().default(''),
  order: z.number().default(9999),
  /** Classification tags (subset of TAGS); `web` is auto-added for link works. */
  tags: z.array(tagSchema).default([]),
  /**
   * Local path to the representative image for index thumbnails, or '' if the
   * work has no images/thumbnails. Chosen from the `cover` metadata (1-based),
   * else the first image, else the first link thumbnail.
   */
  cover: z.string().default(''),
  /** Korean body — 마커 ##ko 텍스트 블록들을 join. 호환용. */
  bodyKo: z.string().default(''),
  /** English body — 마커 ##en 텍스트 블록들을 join. 호환용. */
  bodyEn: z.string().default(''),
  /**
   * 텍스트 블록들을 채널 순서대로 보관. lang은 ##ko / ##en 마커 결과.
   * 페이지에서 ko→en 짝이면 2단, 그 외 1단으로 렌더.
   */
  bodyBlocks: z
    .array(
      z.object({
        lang: z.enum(['ko', 'en']).nullable(),
        html: z.string(),
      }),
    )
    .default([]),
  images: z.array(imageSchema).default([]),
  /** 이미지 그리드 레이아웃 — 각 행의 column 개수 배열. 예: [2,1,3] = 2단/1단/3단 순서.
      Are.na description `layout: 2,1,3` 으로 입력. 합이 images.length면 적용, 아니면 무시. */
  imageLayout: z.array(z.number().int().positive()).default([]),
  links: z.array(linkSchema).default([]),
  /** 본문 @멘션에서 매칭된 인물 슬러그들 (등장 순서, 중복 제거) — 관계형 조인 키. */
  people: z.array(z.string()).default([]),
});

export const worksFileSchema = z.array(workSchema);

/**
 * 인물 레지스트리 — Are.na `people` 채널의 링크 블록 1개 = 인물 1명.
 * 블록 title = "한국어 / English" (작품 채널 이름과 같은 관례),
 * 블록 description = `slug:` (필수에 준함) + `aliases:` (쉼표 구분, 표기 변형).
 * 본문 @멘션이 빌드 타임에 이 레지스트리와 매칭된다.
 */
export const personSchema = z.object({
  slug: z.string().min(1),
  /** 한국어 이름 (title의 '/' 앞). */
  nameKo: z.string().default(''),
  /** 영어 이름 (title의 '/' 뒤). '/' 없으면 nameKo와 같음. */
  nameEn: z.string().default(''),
  /** 매칭에 추가로 쓰는 표기 변형들 (@핸들, 약칭 등). */
  aliases: z.array(z.string()).default([]),
  /** 인물의 대표 링크 — 매칭된 멘션의 href가 이걸로 통일된다. */
  url: z.string().default(''),
  role: z.string().default(''),
  /** 한 줄 소개 — 블록 description의 `desc:` 키 (수집 링크와 동일 문법). */
  description: z.string().default(''),
});

export const peopleFileSchema = z.array(personSchema);

/**
 * 수집 링크 — Are.na `links` 채널의 링크 블록 1개 = 사이트 1개.
 * 우측 컬럼에 채널 순서대로 쌓인다. title이 표시 이름.
 */
export const siteLinkSchema = z.object({
  url: z.string().url(),
  title: z.string().default(""),
  description: z.string().default(""),
  /** 채널에 추가된 시각 (ISO) — Are.na connection.created_at */
  addedAt: z.string().default(""),
});

export const linksFileSchema = z.array(siteLinkSchema);

export type WorkImage = z.infer<typeof imageSchema>;
export type WorkLink = z.infer<typeof linkSchema>;
export type Tag = z.infer<typeof tagSchema>;
export type Work = z.infer<typeof workSchema>;
export type Person = z.infer<typeof personSchema>;
export type SiteLink = z.infer<typeof siteLinkSchema>;

/**
 * 메모 — Are.na memo 채널의 텍스트 블록 1개. 좌측 컬럼 아코디언으로 표시.
 */
export const memoSchema = z.object({
  /** 접힌 라벨 — 본문 첫 문장 (60자 말줄임). */
  title: z.string().min(1),
  /** 본문 원문 — 서식 없이 그대로 (줄바꿈 유지 렌더). */
  text: z.string().default(""),
  /** 수집 시각 (ISO). */
  addedAt: z.string().default(""),
  /** 추가한 사람 (connection.connected_by). */
  addedBy: z.string().default(""),
});
export const memosFileSchema = z.array(memoSchema);
export type Memo = z.infer<typeof memoSchema>;
