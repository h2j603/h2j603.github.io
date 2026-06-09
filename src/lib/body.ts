/**
 * Body-text conversion for Are.na Text blocks.
 *
 * Are.na stores text blocks as Markdown. Authors write the body with normal
 * Markdown: `**bold**`, `*italic*`, `[text](url)`, `## heading`, `- list`.
 * We convert that to clean, *un-styled* semantic HTML — only structural tags,
 * no inline styles — so the site's CSS owns all styling.
 *
 * The bilingual convention: the FIRST text block in a channel is the Korean
 * body, the SECOND is the English body (see works.ts).
 *
 * Defensive: the converter only ever receives a string, and we guard the output
 * against the `[object Object]` marker that broke the old docx pipeline.
 */
import { marked } from 'marked';

marked.setOptions({
  gfm: true,
  breaks: true, // single newlines → <br>, which matches how people type in Are.na
});

/** Strip the broken-serialization marker, just in case it ever appears. */
function guard(html: string, label: string): string {
  if (html.includes('[object Object]')) {
    console.warn(`  ⚠ ${label}: stripped "[object Object]" from body`);
    return html.split('[object Object]').join('');
  }
  return html;
}

/** Convert one Markdown string (an Are.na text block) to semantic HTML. */
export function markdownToHtml(markdown: unknown, label = 'body'): string {
  if (typeof markdown !== 'string' || markdown.trim() === '') return '';
  const html = marked.parse(markdown, { async: false }) as string;
  return guard(html.trim(), label);
}

/**
 * 마크다운 각주 처리. 본문의 `[^id]: 내용` 정의를 분리해 footnotes로 모으고,
 * 본문 `[^id]` 마커를 클릭 가능한 위첨자(`<sup class="fn-ref">`)로 바꾼다.
 * 반환: { html(마커 포함 본문), footnotes(번호·내용) }.
 */
export function markdownToHtmlWithFootnotes(
  markdown: unknown,
  label = 'body',
): { html: string; footnotes: { id: string; html: string }[] } {
  if (typeof markdown !== 'string' || markdown.trim() === '') {
    return { html: '', footnotes: [] };
  }
  const footnotes: { id: string; html: string }[] = [];
  const seen = new Set<string>();
  // 1) 각주 정의 줄 `[^id]: 내용` 추출 + 본문에서 제거 (내용은 인라인 마크다운 변환)
  const bodyMd = markdown.replace(
    /^[ \t]*\[\^([^\]]+)\]:[ \t]*(.+)$/gm,
    (_m: string, id: string, text: string) => {
      const key = id.trim();
      if (!seen.has(key)) {
        seen.add(key);
        const inline = marked.parseInline(text.trim(), { async: false }) as string;
        footnotes.push({ id: key, html: guard(inline.trim(), `${label} fn ${key}`) });
      }
      return '';
    },
  );
  // 2) 본문 마크다운 → HTML
  let html = marked.parse(bodyMd, { async: false }) as string;
  // 3) 본문 `[^id]` → 클릭 가능한 위첨자 마커
  html = html.replace(/\[\^([^\]]+)\]/g, (_m: string, id: string) => {
    const key = id.trim();
    return `<sup class="fn-ref" data-fn="${key}"><a href="#fn-${key}">${key}</a></sup>`;
  });
  return { html: guard(html.trim(), label), footnotes };
}
