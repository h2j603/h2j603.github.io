import 'dotenv/config';
import { getChannelContents, readMarkdown } from '../src/lib/arena.js';
async function main() {
  const blocks = await getChannelContents(5297302);
  blocks.forEach((b: any) => {
    if (!b?.source && !b?.url && b?.type !== 'Link') return;
    console.log(JSON.stringify({
      id: b.id,
      title: (b.title || '').slice(0, 50),
      url: (b.source?.url || b.url || '').slice(0, 70),
      desc: readMarkdown(b.description).replace(/\n/g, ' | ').slice(0, 80),
    }));
  });
}
main().catch((e) => { console.error('✖', e.message); process.exit(1); });
