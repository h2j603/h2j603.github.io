/**
 * One-time (idempotent) Are.na structure bootstrap.
 *
 *   - ensures the index channel exists (slug from ARENA_INDEX_CHANNEL)
 *   - ensures 1–2 sample work channels exist, connected into the index
 *   - writes each sample work's metadata into its channel DESCRIPTION as
 *     `key: value` lines (the build reads metadata from the description, which
 *     you can edit directly in the Are.na UI). doc_id is a placeholder.
 *   - prints every channel's slug + URL so you can open them and add images
 *
 * Re-running is safe: existing channels are detected by slug and reused; a
 * channel that already has a description is left untouched.
 *
 * Requires a WRITE-scope ARENA_TOKEN and network access to api.are.na.
 */
import {
  getChannel,
  createChannel,
  setChannelDescription,
  formatDescriptionMetadata,
  connectChannel,
  type ArenaChannel,
} from '../src/lib/arena.js';
import { ARENA_INDEX_CHANNEL, requireArenaToken } from '../src/lib/config.js';

const SAMPLE_WORKS = [
  {
    title: 'British Poster (sample)',
    metadata: {
      slug: 'british-poster',
      title: '≪british≫ Poster',
      year: '2026',
      medium: '디지털 프린트',
      size: '420×594mm',
      client: 'ttt',
      doc_id: 'REPLACE_WITH_GOOGLE_DOC_ID',
      order: '1',
      tags: 'identity, poster',
      published: 'true',
    },
  },
  {
    title: 'Second Work (sample)',
    metadata: {
      slug: 'second-work',
      title: 'Second Work',
      year: '2025',
      medium: '웹사이트',
      size: '',
      client: '',
      doc_id: 'REPLACE_WITH_GOOGLE_DOC_ID',
      order: '2',
      tags: '',
      published: 'true',
    },
  },
];

const url = (slug: string) => `https://www.are.na/channel/${slug}`;

async function ensureChannel(slug: string, title: string): Promise<ArenaChannel> {
  const existing = await getChannel(slug);
  if (existing) {
    console.log(`= reuse channel "${existing.slug}" (#${existing.id})`);
    return existing;
  }
  const created = await createChannel(title, 'public');
  console.log(`+ created channel "${created.slug}" (#${created.id}) from title "${title}"`);
  if (created.slug !== slug) {
    console.log(`  note: requested slug "${slug}" but Are.na assigned "${created.slug}".`);
  }
  return created;
}

async function ensureDescription(channel: ArenaChannel, meta: Record<string, string>) {
  if (channel.description.trim()) {
    console.log('  = description already set, leaving it untouched');
    return;
  }
  const description = formatDescriptionMetadata(meta);
  await setChannelDescription(channel.id, description);
  console.log('  + wrote description metadata:');
  for (const line of description.split('\n')) console.log(`      ${line}`);
}

async function main() {
  requireArenaToken();

  console.log('\n== Index channel ==');
  const index = await ensureChannel(ARENA_INDEX_CHANNEL, ARENA_INDEX_CHANNEL);

  for (const sample of SAMPLE_WORKS) {
    console.log(`\n== Sample work: ${sample.metadata.slug} ==`);
    const work = await ensureChannel(sample.metadata.slug, sample.title);
    await ensureDescription(work, sample.metadata);

    // Connect into the index channel (best-effort; undocumented body shape).
    try {
      await connectChannel(index.id, work.id);
      console.log(`  ↳ connected into index "${index.slug}"`);
    } catch (err: any) {
      console.log(
        `  ⚠ could not auto-connect into the index (${err.message}).\n` +
          `    Open ${url(work.slug)} and add it to the "${index.slug}" channel manually.`,
      );
    }
  }

  console.log('\n──────── done ────────');
  console.log(`Index : ${url(index.slug)}  (set ARENA_INDEX_CHANNEL=${index.slug})`);
  for (const s of SAMPLE_WORKS) {
    const ch = await getChannel(s.metadata.slug);
    if (ch) console.log(`Work  : ${url(ch.slug)}`);
  }
  console.log('\nNext:');
  console.log('  1. Open each work channel and add image blocks.');
  console.log('  2. Edit the channel DESCRIPTION (in the Are.na UI) to adjust the');
  console.log('     `key: value` metadata lines — title, year, tags, cover, etc.');
  console.log('  3. Create a Google Doc per work (Korean → "---" → English),');
  console.log('     share it (Viewer) with your service-account email, and put');
  console.log("     its ID into the description's `doc_id:` line.");
  console.log('  4. Run `npm run build`.');
}

main().catch((err) => {
  console.error('\n✖ setup-arena failed:', err.message);
  process.exit(1);
});
