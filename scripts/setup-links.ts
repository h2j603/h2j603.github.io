/**
 * 수집 링크 채널(links) 부트스트랩 — 멱등.
 *
 *   1. ARENA_LINKS_CHANNEL 채널이 없으면 private으로 생성
 *   2. 비어 있으면 예시 블록 1개(are.na) 시드 — 컨벤션 확인용, 지워도 됨
 *
 *   블록 관례: value(URL) = 사이트 주소, title = 표시 이름.
 *   우측 컬럼에 채널 순서대로 표시된다 (links.ts와 한 쌍).
 *
 * Usage: npx tsx scripts/setup-links.ts
 */
import { getChannel, getChannelContents, createChannel, createBlock } from '../src/lib/arena.js';
import { classifyBlock } from '../src/lib/images.js';
import { ARENA_LINKS_CHANNEL } from '../src/lib/config.js';

async function main() {
  let ch = await getChannel(ARENA_LINKS_CHANNEL);
  if (ch) {
    console.log(`채널 있음: ${ch.title} (#${ch.id}, slug=${ch.slug})`);
  } else {
    ch = await createChannel('links', 'private');
    console.log(`채널 생성: ${ch.title} (#${ch.id}, slug=${ch.slug})`);
    if (ch.slug !== ARENA_LINKS_CHANNEL) {
      console.log(
        `⚠ 실제 슬러그(${ch.slug})가 기본값(${ARENA_LINKS_CHANNEL})과 다름 — ` +
          `.env와 config 기본값에 반영 필요`,
      );
    }
  }

  const hasLink = (await getChannelContents(ch.id)).some(
    (b) => classifyBlock(b).kind === 'link',
  );
  if (hasLink) {
    console.log('이미 링크 블록 있음 — 시드 건너뜀.');
  } else {
    await createBlock(ch.id, 'https://www.are.na', { title: 'Are.na' });
    console.log('  + 예시 블록 시드: Are.na (https://www.are.na) — 지워도 됨');
  }
  console.log('\n완료 — Are.na에서 링크 블록을 추가하면 다음 빌드에 우측 컬럼 반영.');
}

main().catch((err) => {
  console.error('✖ setup-links failed:', err.message);
  process.exit(1);
});
