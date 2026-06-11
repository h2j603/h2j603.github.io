/**
 * 인물 레지스트리 채널(people) 부트스트랩 — 멱등.
 *
 *   1. ARENA_PEOPLE_CHANNEL 채널이 없으면 private으로 생성
 *   2. 기존 작품 본문의 @멘션에서 추출한 인물들을 링크 블록으로 시드
 *      (이미 같은 slug 블록이 있으면 건너뜀)
 *
 *   블록 관례 (people.ts 파서와 한 쌍):
 *     value(URL)  = 인물 대표 링크
 *     title       = "한국어 / English"
 *     description = `slug:` + `aliases:` (선택 `role:`)
 *
 * Usage: npx tsx scripts/setup-people.ts
 */
import {
  getChannel,
  getChannelContents,
  createChannel,
  createBlock,
  parseDescriptionMetadata,
} from '../src/lib/arena.js';
import { classifyBlock } from '../src/lib/images.js';
import { ARENA_PEOPLE_CHANNEL } from '../src/lib/config.js';

/** 기존 작품 본문 @멘션 전수 조사 결과 (2026-06, URL로 한/영 병합). */
const SEED: { slug: string; ko: string; en: string; url: string; aliases?: string }[] = [
  { slug: 'hyuk', ko: '혁', en: 'Hyuk Jang', url: 'https://hyuk.xyz', aliases: '장혁, hyukxyz' },
  { slug: 'haejin', ko: '해진', en: 'Haejin Lee', url: 'https://www.instagram.com/long_eon' },
  { slug: 'seonghyuk', ko: '성혁', en: 'Surreal Highway', url: 'https://www.instagram.com/surrealhighway' },
  { slug: 'guhong', ko: '구홍', en: 'Guhong Min', url: 'https://minguhong.fyi/' },
  { slug: 'kay', ko: '전가경', en: 'Kay', url: 'https://www.instagram.com/kayjun315' },
  { slug: 'nari', ko: '나리', en: '', url: 'https://nagizin.com/' },
  { slug: 'hajin', ko: '하진', en: '', url: 'https://www.instagram.com/moar.chive/' },
  { slug: 'miju', ko: '미주', en: '', url: 'https://www.instagram.com/mtee.kr/' },
];

async function main() {
  // 1) 채널 확보
  let ch = await getChannel(ARENA_PEOPLE_CHANNEL);
  if (ch) {
    console.log(`채널 있음: ${ch.title} (#${ch.id}, slug=${ch.slug})`);
  } else {
    ch = await createChannel('people', 'private');
    console.log(`채널 생성: ${ch.title} (#${ch.id}, slug=${ch.slug})`);
    if (ch.slug !== ARENA_PEOPLE_CHANNEL) {
      console.log(
        `⚠ 실제 슬러그(${ch.slug})가 기본값(${ARENA_PEOPLE_CHANNEL})과 다름 — ` +
          `.env에 ARENA_PEOPLE_CHANNEL=${ch.slug} 추가 필요`,
      );
    }
  }

  // 2) 기존 블록의 slug 수집 (멱등 가드)
  const existing = new Set<string>();
  for (const b of await getChannelContents(ch.id)) {
    const c = classifyBlock(b);
    if (c.kind !== 'link') continue;
    const meta = parseDescriptionMetadata(c.description);
    if (meta.slug) existing.add(meta.slug);
  }
  if (existing.size) console.log(`기존 인물: ${[...existing].join(', ')}`);

  // 3) 시드
  let created = 0;
  for (const p of SEED) {
    if (existing.has(p.slug)) {
      console.log(`  · ${p.slug} — 이미 있음, 건너뜀`);
      continue;
    }
    const title = p.en && p.en !== p.ko ? `${p.ko} / ${p.en}` : p.ko;
    const desc = [`slug: ${p.slug}`, p.aliases ? `aliases: ${p.aliases}` : '']
      .filter(Boolean)
      .join('\n');
    await createBlock(ch.id, p.url, { title, description: desc });
    console.log(`  + ${p.slug} (${title})`);
    created++;
  }
  console.log(`\n완료 — 생성 ${created} / 전체 ${SEED.length}. Are.na에서 영어 이름·역할 보완 가능.`);
}

main().catch((err) => {
  console.error('✖ setup-people failed:', err.message);
  process.exit(1);
});
