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
  title: z.string().default(''),
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
  /** Korean body, already converted to clean semantic HTML. */
  bodyKo: z.string().default(''),
  /** English body, already converted to clean semantic HTML. */
  bodyEn: z.string().default(''),
  images: z.array(imageSchema).default([]),
  links: z.array(linkSchema).default([]),
});

export const worksFileSchema = z.array(workSchema);

export type WorkImage = z.infer<typeof imageSchema>;
export type WorkLink = z.infer<typeof linkSchema>;
export type Tag = z.infer<typeof tagSchema>;
export type Work = z.infer<typeof workSchema>;
