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
});

export const worksFileSchema = z.array(workSchema);

export type WorkImage = z.infer<typeof imageSchema>;
export type Work = z.infer<typeof workSchema>;
