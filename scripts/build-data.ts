/**
 * Build-time data step. Runs BEFORE `astro build` so that:
 *   1. images are on disk before Astro's image pipeline globs them, and
 *   2. `src/data/works.json` exists for the pages to import.
 *
 * Usage:
 *   tsx scripts/build-data.ts            # fetch + write snapshot
 *   tsx scripts/build-data.ts --dry-run  # fetch + report, don't write
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { getRequestCount } from '../src/lib/arena.js';
import { buildWorks } from '../src/lib/works.js';
import { buildLinks } from "../src/lib/links.js";
import { buildMemos } from "../src/lib/memos.js";
import { buildIntro } from "../src/lib/intro.js";
import { worksFileSchema, introFileSchema, linksFileSchema, memosFileSchema } from "../src/lib/schema.js";
import { DATA_FILE, INTRO_FILE, LINKS_FILE, MEMO_FILE } from "../src/lib/config.js";

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const start = Date.now();
  const { works, summary } = await buildWorks();
  const intro = await buildIntro();
  const links = await buildLinks();
  const memos = await buildMemos();

  const validated = worksFileSchema.parse(works);
  const validatedIntro = introFileSchema.parse(intro);
  const validatedLinks = linksFileSchema.parse(links);
  const validatedMemos = memosFileSchema.parse(memos);

  if (!dryRun) {
    await mkdir(dirname(DATA_FILE), { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(validated, null, 2) + '\n');
    await mkdir(dirname(INTRO_FILE), { recursive: true });
    await writeFile(INTRO_FILE, JSON.stringify(validatedIntro, null, 2) + '\n');
    await mkdir(dirname(LINKS_FILE), { recursive: true });
    await writeFile(LINKS_FILE, JSON.stringify(validatedLinks, null, 2) + "\n");
    await mkdir(dirname(MEMO_FILE), { recursive: true });
    await writeFile(MEMO_FILE, JSON.stringify(validatedMemos, null, 2) + "\n");
  }

  const secs = ((Date.now() - start) / 1000).toFixed(1);
  console.log('\n──────── build-data summary ────────');
  console.log(`works in index : ${summary.total}`);
  console.log(`built          : ${summary.built}`);
  console.log(`locked (unpub) : ${summary.skippedUnpublished}`);
  console.log(
    `failed         : ${summary.failed.length}` +
      (summary.failed.length ? ' (' + summary.failed.join(', ') + ')' : ''),
  );
  console.log(`warnings       : ${summary.warnings.length}`);
  console.log(`links          : ${validatedLinks.length}`);
  console.log(`memos          : ${validatedMemos.length}`);
  console.log(`intro blocks   : ${intro.length}`);
  console.log(`${dryRun ? 'DRY RUN — nothing written' : 'wrote ' + DATA_FILE + ' + ' + INTRO_FILE}`);
  console.log(`api requests   : ${getRequestCount()} (무료 한도 120/min)`);
  console.log(`elapsed        : ${secs}s`);
  console.log('────────────────────────────────────');

  for (const w of validated) {
    console.log(
      `  • ${w.order}\t${w.slug}\t"${w.title}"\timages:${w.images.length}\tko:${w.bodyKo.length}c en:${w.bodyEn.length}c`,
    );
  }
}

main().catch((err) => {
  console.error('\n✖ build-data failed:', err.message);
  process.exit(1);
});
