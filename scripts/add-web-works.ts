/**
 * hyuk.xyz/hyuk/ 의 web 작업 5개를 Are.na로 이주.
 *
 * 인덱스 채널 안의 자식 채널들의 description을 파싱해서 우리 work.slug와
 * 매칭. 같은 slug가 있으면 재사용, 없으면 새로 생성. URL 링크 블록도 같은
 * URL이 이미 있으면 건너뜀. 두 번째 이상 재실행해도 중복 안 만들어짐.
 *
 * description 메타는 최소만:
 *   - slug : URL 슬러그 (work id)
 *   - year : 연도
 *   - tags : 분류 (web 등)
 *   - published : true/false
 *
 * channel.title 자체가 작품 제목이라 별도 title 메타는 안 적음.
 * tags가 분류를 담당하므로 medium도 안 적음.
 */
import {
  getChannel,
  getChannelContents,
  createChannel,
  setChannelDescription,
  formatDescriptionMetadata,
  parseDescriptionMetadata,
  readMarkdown,
  connectChannel,
  createBlock,
  type ArenaChannel,
} from '../src/lib/arena.js';
import { ARENA_INDEX_CHANNEL, requireArenaToken } from '../src/lib/config.js';

interface WebWork {
  slug: string;
  title: string;
  url: string;
  year: string;
}

const WEB_WORKS: WebWork[] = [
  { slug: 'memodummy', title: 'Memodummy', url: 'https://h2j603.github.io/memodummy/', year: '2025' },
  { slug: 'theconespiracy', title: 'The Conespiracy', url: 'https://h2j603.github.io/theconespiracy/', year: '2025' },
  { slug: 'nonataetalk', title: '오직 NONATAE를 위한 다국어 타이포그래피 TALK', url: 'https://h2j603.github.io/nonataetalk/', year: '2025' },
  { slug: 'halftone', title: 'Halftone', url: 'https://h2j603.github.io/halftone/', year: '2025' },
  { slug: 'weeklylog', title: 'Weekly Log', url: 'https://h2j603.github.io/weeklylog/', year: '2025' },
];

/** 인덱스의 자식 채널 중 description.slug === workSlug 인 것을 찾음. */
function findByWorkSlug(
  indexBlocks: any[],
  workSlug: string,
): { id: number; arenaSlug: string; description: string } | null {
  for (const b of indexBlocks) {
    if (b?.type !== 'Channel') continue;
    const desc = readMarkdown(b.description);
    const meta = parseDescriptionMetadata(desc);
    if (meta.slug === workSlug) {
      return { id: b.id, arenaSlug: b.slug, description: desc };
    }
  }
  return null;
}

async function ensureLinkBlock(channelId: number, url: string, title: string) {
  const blocks = await getChannelContents(channelId);
  const hasLink = blocks.some((b: any) => b?.source?.url === url);
  if (hasLink) {
    console.log(`  = 링크 블록 이미 존재: ${url}`);
    return;
  }
  await createBlock(channelId, url, { title });
  console.log(`  + 링크 블록 추가: ${url}`);
}

async function main() {
  requireArenaToken();

  const index = await getChannel(ARENA_INDEX_CHANNEL);
  if (!index) throw new Error(`인덱스 채널 "${ARENA_INDEX_CHANNEL}" 없음`);
  console.log(`인덱스: ${index.title} (#${index.id}, slug=${index.slug})\n`);

  const indexBlocks = await getChannelContents(index.id);
  const connectedSlugs = new Set(
    indexBlocks.filter((b: any) => b?.type === 'Channel').map((b: any) => b.slug as string),
  );

  let order = 100;
  for (const w of WEB_WORKS) {
    console.log(`== ${w.slug} ==`);

    // 1. 인덱스에서 description.slug 매칭
    let channel: ArenaChannel | null = null;
    const matched = findByWorkSlug(indexBlocks, w.slug);
    if (matched) {
      channel = { id: matched.id, slug: matched.arenaSlug, title: w.title, description: matched.description };
      console.log(`  = 채널 재사용 (description.slug 매칭) "${matched.arenaSlug}" (#${matched.id})`);
    } else {
      // 2. 새로 생성
      const created = await createChannel(w.title, 'private');
      channel = created;
      console.log(`  + 채널 생성 "${created.slug}" (#${created.id})`);
      if (created.slug !== w.slug) {
        console.log(`    note: 점유된 슬러그 → Are.na가 "${created.slug}" 할당`);
      }
    }

    // 3. description (없을 때만 작성)
    if (!channel.description.trim()) {
      const meta = {
        slug: w.slug,
        year: w.year,
        order: String(order++),
        tags: 'web',
        published: 'true',
      };
      await setChannelDescription(channel.id, formatDescriptionMetadata(meta));
      console.log(`  + description 설정 (slug=${w.slug})`);
    } else {
      console.log(`  = description 이미 설정됨`);
    }

    // 4. 인덱스에 연결 (이미 연결돼있으면 skip)
    if (connectedSlugs.has(channel.slug)) {
      console.log(`  = 인덱스에 이미 연결됨`);
    } else {
      try {
        await connectChannel(index.id, channel.id);
        console.log(`  ↳ 인덱스에 연결`);
        connectedSlugs.add(channel.slug);
      } catch (e: any) {
        console.log(`  ⚠ 연결 실패 (${e.message})`);
      }
    }

    // 5. 링크 블록 추가 (이미 있으면 skip)
    await ensureLinkBlock(channel.id, w.url, w.title);
    console.log('');
  }

  console.log('── 완료 ──');
  console.log(`총 ${WEB_WORKS.length}개 작품 처리.`);
  console.log('다음: 잠시 대기 후 `npm run check:arena` → `npm run build`');
}

main().catch((err) => {
  console.error('\n✖ add-web-works 실패:', err.message);
  process.exit(1);
});
