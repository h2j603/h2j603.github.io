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
import { buildWorks } from '../src/lib/works.js';
import { buildIntro, buildFooter } from '../src/lib/intro.js';
import { worksFileSchema } from '../src/lib/schema.js';
import { DATA_FILE, INTRO_FILE, FOOTER_FILE } from '../src/lib/config.js';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const start = Date.now();
  const { works, summary } = await buildWorks();
  const intro = await buildIntro();
  const footer = await buildFooter();

  const validated = worksFileSchema.parse(works);

  if (!dryRun) {
    await mkdir(dirname(DATA_FILE), { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(validated, null, 2) + '\n');
    await mkdir(dirname(INTRO_FILE), { recursive: true });
    await writeFile(INTRO_FILE, JSON.stringify(intro, null, 2) + '\n');
    await mkdir(dirname(FOOTER_FILE), { recursive: true });
    await writeFile(FOOTER_FILE, JSON.stringify(footer, null, 2) + '\n');
  }

  const secs = ((Date.now() - start) / 1000).toFixed(1);
  console.log('\n──────── build-data summary ────────');
  console.log(`works in index : ${summary.total}`);
  console.log(`built          : ${summary.built}`);
  console.log(`unpublished    : ${summary.skippedUnpublished}`);
  console.log(
    `failed         : ${summary.failed.length}` +
      (summary.failed.length ? ' (' + summary.failed.join(', ') + ')' : ''),
  );
  console.log(`warnings       : ${summary.warnings.length}`);
  console.log(`intro blocks   : ${intro.length}`);
  console.log(`footer blocks  : ${footer.length}`);
  console.log(`${dryRun ? 'DRY RUN — nothing written' : 'wrote ' + DATA_FILE + ' + ' + INTRO_FILE}`);
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
