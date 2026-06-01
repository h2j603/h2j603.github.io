/**
 * Google Docs body fetching + conversion.
 *
 * Auth: service account (JWT). The key is read from GOOGLE_SERVICE_ACCOUNT_JSON
 * which may be a file path, raw JSON, or base64-encoded JSON. Each work's Doc
 * must be shared (Viewer) with the service account email.
 *
 * The Docs document is converted to clean, *un-styled* semantic HTML. We emit
 * only <h1..h6> <p> <ul>/<ol> <li> <strong> <em> <u> <a>. Everything we can't
 * faithfully represent (footnotes, inline objects/images, equations, tables,
 * page breaks…) is skipped with a warning — and we never let a non-string
 * value reach the output, which is how the old docx pipeline leaked
 * "[object Object]".
 */
import { readFileSync } from 'node:fs';
import { google } from 'googleapis';
import { getGoogleServiceAccountRaw } from './config.js';

export interface DocBody {
  bodyKo: string;
  bodyEn: string;
}

/** Separator paragraph that splits Korean body from English body. */
const SPLIT_RE = /^[-*_]{3,}$/;

let cachedDocs: ReturnType<typeof google.docs> | null = null;

function loadCredentials(): Record<string, any> {
  const raw = getGoogleServiceAccountRaw();
  if (!raw) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not set.');
  }
  const trimmed = raw.trim();
  // Raw JSON?
  if (trimmed.startsWith('{')) return JSON.parse(trimmed);
  // base64 JSON? (no path separators, long, base64 alphabet)
  if (!trimmed.includes('/') && !trimmed.includes('\\') && trimmed.length > 100) {
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
      if (decoded.trim().startsWith('{')) return JSON.parse(decoded);
    } catch {
      /* fall through to file path */
    }
  }
  // Otherwise treat as a file path.
  return JSON.parse(readFileSync(trimmed, 'utf8'));
}

function getDocsClient() {
  if (cachedDocs) return cachedDocs;
  const credentials = loadCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/documents.readonly'],
  });
  cachedDocs = google.docs({ version: 'v1', auth });
  return cachedDocs;
}

export async function fetchDoc(docId: string): Promise<DocBody> {
  const docs = getDocsClient();
  const res = await docs.documents.get({ documentId: docId });
  return convertDocument(res.data, docId);
}

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const HEADING_TAGS: Record<string, string> = {
  TITLE: 'h1',
  SUBTITLE: 'h2',
  HEADING_1: 'h1',
  HEADING_2: 'h2',
  HEADING_3: 'h3',
  HEADING_4: 'h4',
  HEADING_5: 'h5',
  HEADING_6: 'h6',
};

/** Render one paragraph's text runs to inline HTML; returns plain text too. */
function renderTextRuns(elements: any[], warn: (m: string) => void): { html: string; text: string } {
  let html = '';
  let text = '';
  for (const el of elements ?? []) {
    if (el.textRun) {
      const content = el.textRun.content;
      if (typeof content !== 'string') {
        warn('non-string textRun content skipped');
        continue;
      }
      // Drop trailing newline that Docs appends to each paragraph.
      const cleaned = content.replace(/\n$/, '');
      if (cleaned === '') continue;
      text += cleaned;
      let piece = escapeHtml(cleaned);
      const st = el.textRun.textStyle ?? {};
      if (st.bold) piece = `<strong>${piece}</strong>`;
      if (st.italic) piece = `<em>${piece}</em>`;
      if (st.underline && !st.link) piece = `<u>${piece}</u>`;
      const url = st.link?.url;
      if (typeof url === 'string' && url) {
        piece = `<a href="${escapeHtml(url)}">${piece}</a>`;
      }
      html += piece;
    } else if (el.footnoteReference) {
      warn('footnote reference skipped');
    } else if (el.inlineObjectElement) {
      warn('inline object/image skipped (images come from Are.na)');
    } else if (el.pageBreak || el.horizontalRule || el.columnBreak) {
      /* structural, ignore silently */
    } else if (el.equation) {
      warn('equation skipped');
    } else if (el.person || el.richLink) {
      // Smart chips — render their display text only, never the object.
      const display =
        el.person?.personProperties?.name ?? el.richLink?.richLinkProperties?.title;
      if (typeof display === 'string') {
        text += display;
        html += escapeHtml(display);
      } else {
        warn('smart chip without text skipped');
      }
    }
  }
  return { html, text };
}

function isOrderedList(doc: any, listId: string, level: number): boolean {
  try {
    const nl = doc.lists?.[listId]?.listProperties?.nestingLevels?.[level];
    const glyph = nl?.glyphType;
    return typeof glyph === 'string' && /DECIMAL|ALPHA|ROMAN/i.test(glyph);
  } catch {
    return false;
  }
}

export function convertDocument(doc: any, docId = ''): DocBody {
  const warnings = new Map<string, number>();
  const warn = (m: string) => warnings.set(m, (warnings.get(m) ?? 0) + 1);

  // We emit into two buffers, switching on the `---` separator.
  const buffers: string[][] = [[], []];
  let target = 0;

  // List grouping state.
  let listOpen = false;
  let listTag: 'ul' | 'ol' = 'ul';
  const closeList = () => {
    if (listOpen) {
      buffers[target].push(`</${listTag}>`);
      listOpen = false;
    }
  };

  const content: any[] = doc?.body?.content ?? [];
  for (const element of content) {
    if (element.table) {
      closeList();
      warn('table skipped');
      continue;
    }
    if (element.tableOfContents) {
      closeList();
      warn('table of contents skipped');
      continue;
    }
    if (!element.paragraph) continue;

    const para = element.paragraph;
    const { html, text } = renderTextRuns(para.elements, warn);
    const trimmed = text.trim();

    // Separator → switch to the next language buffer (only once).
    if (SPLIT_RE.test(trimmed) && html.replace(/<[^>]+>/g, '').trim() === trimmed) {
      closeList();
      if (target === 0) target = 1;
      continue;
    }

    if (trimmed === '') {
      // Empty paragraph: ends any list, otherwise produces nothing.
      closeList();
      continue;
    }

    const style = para.paragraphStyle?.namedStyleType;
    const headingTag = typeof style === 'string' ? HEADING_TAGS[style] : undefined;

    if (para.bullet) {
      const listId = para.bullet.listId;
      const level = para.bullet.nestingLevel ?? 0;
      const wantTag = isOrderedList(doc, listId, level) ? 'ol' : 'ul';
      if (listOpen && wantTag !== listTag) closeList();
      if (!listOpen) {
        listTag = wantTag;
        buffers[target].push(`<${listTag}>`);
        listOpen = true;
      }
      buffers[target].push(`<li>${html}</li>`);
      continue;
    }

    closeList();
    const tag = headingTag ?? 'p';
    buffers[target].push(`<${tag}>${html}</${tag}>`);
  }
  closeList();

  if (warnings.size) {
    const summary = [...warnings.entries()].map(([m, n]) => `${m} ×${n}`).join('; ');
    console.warn(`  ⚠ Doc ${docId || ''}: ${summary}`);
  }

  const bodyKo = buffers[0].join('\n');
  const bodyEn = buffers[1].join('\n');

  // Final guard: the broken-serialization marker must never reach output.
  const guard = (s: string, label: string) => {
    if (s.includes('[object Object]')) {
      console.warn(`  ⚠ Doc ${docId}: stripped "[object Object]" from ${label}`);
      return s.split('[object Object]').join('');
    }
    return s;
  };

  return { bodyKo: guard(bodyKo, 'bodyKo'), bodyEn: guard(bodyEn, 'bodyEn') };
}
