/**
 * /works.json — 작업 목록 정적 파일. 다른 사이트(aqua.hyuk.xyz)가 읽어 쓴다.
 *
 * 데이터·가공은 표(index.astro)와 같은 것을 그대로 쓴다: getTableWorks()가
 * 표 순서(연도 desc + 같은 연도는 index 채널 순서)를, orderedTagsOf()가
 * 분류 칸(cat-tag) 순서를 만든다. 표의 잠긴 행(published: false)은 뺀다.
 */
import type { APIRoute } from 'astro';
import { getTableWorks, orderedTagsOf } from '../lib/site-data.js';

export const GET: APIRoute = () => {
  const works = getTableWorks()
    .filter((w) => w.published)
    .map((w) => {
      // 제목 폴백 규칙은 index.astro와 같다 (빈 값이면 slug).
      const title = w.title || w.slug;
      return {
        slug: w.slug,
        title,
        titleEn: w.titleEn || title,
        tags: orderedTagsOf(w),
        url: `https://hyuk.xyz/#${w.slug}`,
        // 외부 라이브 사이트 주소 — 웹 작업 채널의 첫 링크 블록 URL.
        // (index.astro가 카드 iframe·링크에 쓰는 것과 같은 필드)
        webUrl: w.links[0]?.url ?? null,
      };
    });

  return new Response(JSON.stringify({ generatedAt: new Date().toISOString(), works }, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
