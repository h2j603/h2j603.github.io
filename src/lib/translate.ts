/**
 * Build-time 메모 번역 (Claude Haiku) + 디스크 캐시 — 양방향.
 *
 * 한국어 메모는 영어로, 영어 메모는 한국어로 번역해 스냅샷에 굽는다 —
 * 런타임 API 호출 없음. 캐시는 (모델+타깃+내용) sha256 → 번역문 매핑이라
 * 같은 메모는 평생 1회만 번역된다(30분 cron 재빌드에도 재과금 없음).
 * 키가 없거나 API가 실패하면 ''(빈 문자열)로 두고 페이지가 원문으로 폴백 —
 * 빌드는 절대 안 죽는다.
 *
 * 모델은 TRANSLATE_MODEL(기본 claude-haiku-4-5)로 교체 가능.
 */
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { TRANSLATIONS_FILE, TRANSLATE_MODEL, getAnthropicKey } from './config.js';

const POOL = 4; // 동시 요청 수 — works.ts의 fetch 풀과 같은 어법

export type TargetLang = 'en' | 'ko';

const SYSTEM: Record<TargetLang, string> = {
  en: `You are translating personal notepad memos by a Korean graphic designer for the English version of his portfolio site (hyuk.xyz).

Translate the given memo from Korean to English.
- Keep the original register — these memos are mostly plain/formal notes; do not make them chattier or stiffer than the source.
- Preserve line breaks exactly. Keep URLs, code, and markdown syntax as-is.
- If part of the memo is already English, keep it unchanged.
- Output ONLY the translation. No quotes around it, no notes, no commentary.`,
  ko: `You are translating personal notepad memos by a Korean graphic designer for the Korean version of his portfolio site (hyuk.xyz).

Translate the given memo from English to Korean.
- Use natural written Korean in plain declarative style (문어체, '~다' 서술) — these memos are mostly plain/formal notes.
- Preserve line breaks exactly. Keep URLs, code, markdown syntax, and proper nouns/technical terms that are conventionally kept in English as-is.
- If part of the memo is already Korean, keep it unchanged.
- Output ONLY the translation. No quotes around it, no notes, no commentary.`,
};

/** 메모가 한국어 위주인가 — 한글이 (한글+라틴)의 10% 이상이면 한국어로 본다.
 *  한국어 메모는 영문 용어가 많아도 조사·서술어로 한글 비중이 이보다 높고,
 *  진짜 영어 메모는 한글이 ~0%(인용 한두 단어 수준)라 10%에서 안전하게 갈린다. */
export function isKoreanText(text: string): boolean {
  const hangul = (text.match(/[가-힣ㄱ-ㆎ]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  if (hangul + latin === 0) return true; // 글자 없으면 번역 무의미 — 한국어 취급
  return hangul / (hangul + latin) >= 0.1;
}

type Cache = Record<string, string>;

/** 캐시 키 세대 — 번역 품질에 영향 주는 파라미터가 바뀌면 올려서 전체 무효화.
 *  v2: max_tokens 2000→16000 + 잘림(stop_reason) 검사 도입. 이전 세대 캐시엔
 *  max_tokens에 잘린 번역이 저장됐을 수 있어 전부 1회 재번역한다. */
const CACHE_GEN = 'v2';

function keyOf(target: TargetLang, text: string): string {
  return createHash('sha256').update(CACHE_GEN + ' ' + TRANSLATE_MODEL + ' ' + target + ' ' + text).digest('hex');
}

function loadCache(): Cache {
  try {
    const c = JSON.parse(readFileSync(TRANSLATIONS_FILE, 'utf8'));
    return c && typeof c === 'object' ? c : {};
  } catch {
    return {};
  }
}

function saveCache(cache: Cache): void {
  try {
    mkdirSync(dirname(TRANSLATIONS_FILE), { recursive: true });
    writeFileSync(TRANSLATIONS_FILE, JSON.stringify(cache, null, 2) + '\n');
  } catch (err: any) {
    console.warn(`  ⚠ translate: cache write failed: ${err.message}`);
  }
}

/**
 * texts를 target 언어로 번역해 같은 순서의 배열로 돌려준다. 실패한 항목은 ''.
 * 캐시 히트는 API를 안 부른다. 키 없으면 전부 '' (경고 1회).
 */
export async function translateTo(target: TargetLang, texts: string[]): Promise<string[]> {
  const cache = loadCache();
  const out = texts.map((t) => (t.trim() ? cache[keyOf(target, t)] ?? '' : ''));
  const missing = texts
    .map((t, i) => ({ t, i }))
    .filter(({ t, i }) => t.trim() && !out[i]);
  if (!missing.length) {
    if (texts.length) console.log(`  translate→${target}: ${out.filter(Boolean).length} cached, 0 new`);
    return out;
  }

  const apiKey = getAnthropicKey();
  if (!apiKey) {
    console.warn(`  ⚠ translate→${target}: ANTHROPIC_API_KEY 없음 — ${missing.length}개 번역 생략(원문 폴백)`);
    return out;
  }
  const client = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 2 });

  let added = 0;
  let failed = 0;
  let dead = false; // 인증류 오류 — 남은 요청 전부 생략 (헛호출 방지)

  async function one(m: { t: string; i: number }): Promise<void> {
    if (dead) { failed++; return; }
    try {
      const msg = await client.messages.create({
        model: TRANSLATE_MODEL,
        // 넉넉하게 — 한국어 출력은 토큰 소모가 커서 2000이면 긴 메모가 중간에
        // 잘렸다 (Haiku 4.5 출력 한도는 64K, 비스트리밍 안전선 안쪽).
        max_tokens: 16000,
        system: SYSTEM[target],
        messages: [{ role: 'user', content: m.t }],
      });
      // 출력 한도에 걸려 잘린 번역은 버린다 — 캐시에 넣으면 영구히 잘린 채
      // 남으므로 실패 취급(원문 폴백)하고 경고만 남긴다.
      if (msg.stop_reason === 'max_tokens') {
        failed++;
        console.warn(`  ⚠ translate→${target}: "${m.t.slice(0, 20)}…" 번역이 max_tokens에 잘림 — 원문 폴백`);
        return;
      }
      const en = msg.content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('')
        .trim();
      if (en) {
        out[m.i] = en;
        cache[keyOf(target, m.t)] = en;
        added++;
      } else {
        failed++;
      }
    } catch (err: any) {
      failed++;
      if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
        dead = true; // 키가 죽었으면 나머지도 실패 확정 — 조용히 폴백
        console.warn(`  ⚠ translate→${target}: API 키 인증 실패 — 남은 번역 생략(원문 폴백)`);
      } else {
        console.warn(`  ⚠ translate→${target}: "${m.t.slice(0, 20)}…" 실패 (${err.message}) — 원문 폴백`);
      }
    }
  }

  // 동시 POOL개 워커 — 순서는 out[i] 인덱스로 보존
  let cursor = 0;
  async function worker() {
    while (cursor < missing.length) await one(missing[cursor++]);
  }
  await Promise.all(Array.from({ length: Math.min(POOL, missing.length) }, worker));

  if (added) saveCache(cache);
  console.log(`  translate→${target}(${TRANSLATE_MODEL}): +${added} new, ${out.filter(Boolean).length - added} cached, ${failed} failed`);
  return out;
}
