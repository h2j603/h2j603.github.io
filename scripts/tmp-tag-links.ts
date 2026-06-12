import 'dotenv/config';
import { getChannelContents, readMarkdown } from '../src/lib/arena.js';

const TOKEN = process.env.ARENA_TOKEN!;
// 용도 라벨 — 기존 'tools' 어법(영문 소문자)에 맞춤
const TAGS: Record<number, string> = {
  46970427: 'archive',   // 서울시립 미술아카이브 SeMA AA
  46968918: 'interview', // 안팎 — 크리스 하마모토 대화
  4431087:  'essay',     // Web design as architecture
  46946558: 'essay',     // Electric Myths
  46946530: 'essay',     // The Confiscation of Digital Memory
  46946525: 'essay',     // What Is a Website Good For?
  46946522: 'essay',     // Paging the Poetic Web
  46945329: 'studio',    // 민구홍 매뉴팩처링 FAQ
  46945301: 'interview', // 안팎과 이야기하는 안팎
  46945290: 'archive',   // 서울시립미술관 코랄
  46945282: 'index',     // cyberfeminism index
  46945276: 'essay',     // My website is a shifting house (TCI)
};

async function main() {
  const blocks = await getChannelContents(5297302);
  for (const b of blocks as any[]) {
    const tag = TAGS[b?.id];
    if (!tag) continue;
    const cur = readMarkdown(b.description);
    // 기존 tags: 줄은 교체, 나머지 프로즈는 보존
    const kept = cur.split('\n').filter((l) => !/^\s*tags\s*:/i.test(l)).join('\n').trim();
    const next = (kept ? kept + '\n\n' : '') + `tags: ${tag}`;
    const res = await fetch(`https://api.are.na/v3/blocks/${b.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ description: next }),
    });
    if (!res.ok) throw new Error(`block ${b.id}: ${res.status} ${await res.text()}`);
    console.log(`✓ ${b.id} ← tags: ${tag} (${(b.title || '').slice(0, 30)})`);
  }
  console.log('완료 — tools 2개는 기존 유지');
}
main().catch((e) => { console.error('✖', e.message); process.exit(1); });
