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
