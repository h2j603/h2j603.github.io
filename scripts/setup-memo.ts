/**
 * 메모 채널(memo) 부트스트랩 — 멱등.
 * 텍스트 블록 1개 = 메모 1개. title = 접힌 라벨, 본문 = 펼친 내용.
 * Usage: npx tsx scripts/setup-memo.ts
 */
import { getChannel, getChannelContents, createChannel, createBlock } from '../src/lib/arena.js';
import { classifyBlock } from '../src/lib/images.js';
import { ARENA_MEMO_CHANNEL } from '../src/lib/config.js';

async function main() {
  let ch = await getChannel(ARENA_MEMO_CHANNEL);
  if (ch) {
    console.log(`채널 있음: ${ch.title} (#${ch.id}, slug=${ch.slug})`);
  } else {
    ch = await createChannel('memo', 'private');
    console.log(`채널 생성: ${ch.title} (#${ch.id}, slug=${ch.slug})`);
    if (ch.slug !== ARENA_MEMO_CHANNEL) {
      console.log(`⚠ 실제 슬러그(${ch.slug}) — config 기본값·.env 반영 필요`);
    }
  }
  const hasText = (await getChannelContents(ch.id)).some((b) => classifyBlock(b).kind === 'text');
  if (hasText) {
    console.log('이미 텍스트 블록 있음 — 시드 건너뜀.');
  } else {
    await createBlock(
      ch.id,
      '이 채널의 텍스트 블록이 사이트 왼쪽 컬럼에 메모로 표시됩니다. 블록 제목이 접힌 상태의 라벨이고, 누르면 본문이 펼쳐져요. (이 예시는 지워도 됩니다)',
      { title: '메모 사용법' },
    );
    console.log('  + 예시 메모 시드 — 지워도 됨');
  }
  console.log('\n완료.');
}
main().catch((err) => { console.error('✖', err.message); process.exit(1); });
