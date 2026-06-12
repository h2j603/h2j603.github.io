/**
 * One-time (idempotent) Are.na structure bootstrap.
 *
 *   - ensures the index channel exists (slug from ARENA_INDEX_CHANNEL)
 *   - ensures 1–2 sample work channels exist, connected into the index
 *   - writes each sample work's metadata into its channel DESCRIPTION as
 *     `key: value` lines (the build reads metadata from the description, which
 *     you can edit directly in the Are.na UI).
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
import { ARENA_INDEX_CHANNEL, ARENA_INTRO_CHANNEL, requireArenaToken } from '../src/lib/config.js';

// setup:arena 재실행 시 sample 작품을 추가로 만들지 않기 위해 비워둠.
// 실제 작품은 Are.na UI에서 직접 채널을 만들고 인덱스에 연결해 관리.
const SAMPLE_WORKS: { title: string; metadata: Record<string, string> }[] = [];

const url = (slug: string) => `https://www.are.na/channel/${slug}`;

async function ensureChannel(slug: string, title: string): Promise<ArenaChannel> {
  const existing = await getChannel(slug);
  if (existing) {
    console.log(`= reuse channel "${existing.slug}" (#${existing.id})`);
    return existing;
  }
  const created = await createChannel(title, 'private');
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

  console.log('\n== Intro channel (About) ==');
  const intro = await getChannel(ARENA_INTRO_CHANNEL);
  if (intro) {
    console.log(`  = intro 채널 재사용 "${intro.slug}" (#${intro.id})`);
  } else {
    const created = await createChannel('About', 'private');
    console.log(`  + intro 채널 생성 "${created.slug}" (#${created.id})`);
    if (created.slug !== ARENA_INTRO_CHANNEL) {
      console.log(`    note: 요청 슬러그 "${ARENA_INTRO_CHANNEL}" → Are.na가 "${created.slug}" 할당`);
      console.log(`    .env의 ARENA_INTRO_CHANNEL을 "${created.slug}"로 업데이트 필요`);
    }
    console.log(`  → 텍스트 블록을 여러 개 추가하면 페이지 좌측에 hr로 구분되어 표시됨`);
  }

  console.log('\n──────── done ────────');
  console.log(`Index : ${url(index.slug)}  (set ARENA_INDEX_CHANNEL=${index.slug})`);
  for (const s of SAMPLE_WORKS) {
    const ch = await getChannel(s.metadata.slug);
    if (ch) console.log(`Work  : ${url(ch.slug)}`);
  }
  console.log('\nNext:');
  console.log('  1. Open each work channel and add image blocks.');
  console.log('  2. Add Text blocks for the body (Markdown): the 1st text block');
  console.log('     is the Korean body, the 2nd is the English body.');
  console.log('  3. Edit the channel DESCRIPTION (in the Are.na UI) to adjust the');
  console.log('     `key: value` metadata lines — title, year, tags, cover, etc.');
  console.log('  4. Run `npm run build`.');
}

main().catch((err) => {
  console.error('\n✖ setup-arena failed:', err.message);
  process.exit(1);
});
