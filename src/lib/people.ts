/**
 * 인물 레지스트리 — Are.na `people` 채널 (링크 블록 1개 = 인물 1명).
 *
 *   블록 title       = "한국어 / English"  (작품 채널 이름과 같은 관례)
 *   블록 value(URL)  = 인물 대표 링크 — 매칭된 멘션의 href가 이걸로 통일됨
 *   블록 description = `slug: haejin` + `aliases: 이해진, long_eon` (선택: `role:`)
 *
 * 본문 @멘션(마크다운 링크 텍스트가 @로 시작)이 빌드 타임에 이 레지스트리와
 * 이름으로 매칭된다(방식 ⓐ):
 *   - 매칭 키: nameKo / nameEn / aliases (정규화: @·공백 정리 + 소문자)
 *   - 매칭되면: href → 레지스트리 URL, 텍스트 → 블록 언어에 맞는 이름(한/영),
 *     class="mention" + data-person="slug" 부여, 작품의 people[]에 슬러그 기록
 *   - 매칭 안 되면: 원본 그대로 (지금까지의 동작 — 깨질 게 없다)
 *
 * 채널이 없거나 비어 있으면 레지스트리는 빈 배열 — 전 과정이 no-op.
 */
import { tryGetChannelContents, parseDescriptionMetadata } from './arena.js';
import { classifyBlock } from './images.js';
import { personSchema, type Person } from './schema.js';
import { ARENA_PEOPLE_CHANNEL } from './config.js';

/** 이름 매칭 키 정규화 — 앞 @ 제거, 공백 정리, 라틴 소문자화. */
export function normalizeName(raw: string): string {
  return raw.replace(/^@/, '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function kebab(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function buildPeople(): Promise<Person[]> {
  // contents를 바로 친다 — 존재 확인용 getChannel 요청 1회 절약 (404/403 → null)
  const blocks = await tryGetChannelContents(ARENA_PEOPLE_CHANNEL);
  if (!blocks) {
    console.warn(`people: channel "${ARENA_PEOPLE_CHANNEL}" not found — 멘션 매칭 없이 진행.`);
    return [];
  }
  const out: Person[] = [];
  for (const b of blocks) {
    const c = classifyBlock(b);
    if (c.kind !== 'link') continue; // 인물 = 링크 블록만
    const meta = parseDescriptionMetadata(c.description);

    // title "한국어 / English" 분리 — 작품 채널 이름과 동일 관례
    const raw = (c.title || '').trim();
    const slash = raw.indexOf('/');
    const nameKo = (slash >= 0 ? raw.slice(0, slash) : raw).trim();
    const nameEn = (slash >= 0 ? raw.slice(slash + 1) : raw).trim();

    const slug = (meta.slug || kebab(nameEn) || kebab(nameKo)).trim();
    if (!slug) {
      console.warn(`people: block ${b?.id} has no usable slug — skipped`);
      continue;
    }
    const aliases = (meta.aliases ?? '')
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    const parsed = personSchema.safeParse({
      slug,
      nameKo,
      nameEn,
      aliases,
      url: c.url,
      role: meta.role ?? '',
      description: (meta.desc ?? '').trim(),
    });
    if (!parsed.success) {
      console.warn(`people: block ${b?.id} schema validation failed — skipped`);
      continue;
    }
    out.push(parsed.data);
  }
  return out;
}

/** 정규화된 이름/별칭 → Person 룩업 맵. */
export function buildMentionIndex(people: Person[]): Map<string, Person> {
  const index = new Map<string, Person>();
  for (const p of people) {
    for (const key of [p.nameKo, p.nameEn, ...p.aliases]) {
      const k = normalizeName(key);
      if (!k) continue;
      if (index.has(k) && index.get(k)!.slug !== p.slug) {
        console.warn(`people: 이름 "${key}"가 ${index.get(k)!.slug}·${p.slug} 둘 다에 매칭 — 먼저 온 쪽 유지`);
        continue;
      }
      index.set(k, p);
    }
  }
  return index;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const MENTION_ANCHOR_RE = /<a href="([^"]*)">(@[^<]*)<\/a>/g;

/**
 * 변환된 본문 HTML 안의 @멘션 앵커를 레지스트리 기준으로 재작성.
 * blockLang에 맞는 이름(한/영)으로 표기를 통일하고, 매칭된 슬러그를 수집한다.
 */
export function rewriteMentions(
  html: string,
  blockLang: 'ko' | 'en' | null,
  index: Map<string, Person>,
  matchedSlugs: Set<string>,
): string {
  if (index.size === 0) return html;
  return html.replace(MENTION_ANCHOR_RE, (whole, href: string, text: string) => {
    const person = index.get(normalizeName(text));
    if (!person) return whole; // 미등록 인물 — 원본 유지 (fallback)
    matchedSlugs.add(person.slug);
    const name =
      blockLang === 'en'
        ? person.nameEn || person.nameKo
        : blockLang === 'ko'
          ? person.nameKo || person.nameEn
          : text.replace(/^@/, ''); // lang 미상 블록은 쓴 그대로
    const url = person.url || href;
    return `<a href="${escapeHtml(url)}" class="mention" data-person="${escapeHtml(person.slug)}">@${escapeHtml(name)}</a>`;
  });
}
