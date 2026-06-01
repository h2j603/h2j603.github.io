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
 * A Link (or embed/Media) block from the work channel. We keep the URL + text
 * only — the thumbnail is deliberately NOT downloaded (it's not artwork, and we
 * don't embed remote URLs). Rendered as a plain list of outbound links.
 */
export const linkSchema = z.object({
  url: z.string().url(),
  title: z.string().default(''),
  description: z.string().default(''),
});

export const workSchema = z.object({
  slug: z.string().min(1),
  title: z.string().default(''),
  year: z.string().default(''),
  medium: z.string().default(''),
  size: z.string().default(''),
  client: z.string().default(''),
  order: z.number().default(9999),
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
export type Work = z.infer<typeof workSchema>;
