export type TodoTag = 'TODO' | 'FIXME' | 'HACK';
export const TODO_COLORS = {
  TODO: { foreground: '#854D0E', flat: '#FEF9C3', marker: '#FDE047' },
  FIXME: { foreground: '#9F1239', flat: '#FFE4E6', marker: '#FDA4AF' },
  HACK: { foreground: '#1E40AF', flat: '#E0F2FE', marker: '#93C5FD' }
} as const;
const slash = new Set(['rust', 'java', 'typescript', 'typescriptreact', 'javascript', 'javascriptreact', 'c', 'cpp', 'go', 'csharp', 'kotlin', 'swift']);
const hash = new Set(['python', 'shellscript', 'shell', 'bash', 'zsh', 'powershell', 'yaml', 'toml']);
const dash = new Set(['sql', 'lua']);
const html = new Set(['html', 'xml', 'markdown']);

export function supportsTodoLanguage(languageId: string): boolean {
  return slash.has(languageId) || hash.has(languageId) || dash.has(languageId) || html.has(languageId);
}

/** Line-local comment/quote heuristic, not a language parser or cross-line lexer. */
export function findTags(lineText: string, languageId: string): { tag: TodoTag; start: number; end: number }[] {
  if (!supportsTodoLanguage(languageId)) return [];
  const spans: { start: number; end: number }[] = [];
  let quote = '', i = 0;
  const continuation = lineText.search(/\S/);
  if (slash.has(languageId) && continuation >= 0 && lineText[continuation] === '*') {
    const end = lineText.indexOf('*/', continuation);
    spans.push({ start: continuation, end: end < 0 ? lineText.length : end + 2 });
    i = end < 0 ? lineText.length : end + 2;
  }
  while (i < lineText.length) {
    const char = lineText[i];
    if (quote) {
      if (char === '\\') i++;
      else if (char === quote) quote = '';
      i++; continue;
    }
    if (languageId === 'rust' && char === "'") {
      const lifetime = lineText.slice(i).match(/^'[A-Za-z_][A-Za-z_0-9]*/)?.[0];
      if (lifetime && lineText[i + lifetime.length] !== "'") { i += lifetime.length; continue; }
    }
    if ('\'"`'.includes(char)) { quote = char; i++; continue; }
    if (slash.has(languageId) && lineText.startsWith('//', i) || hash.has(languageId) && char === '#' ||
      dash.has(languageId) && lineText.startsWith('--', i)) {
      spans.push({ start: i, end: lineText.length }); break;
    }
    const opener = slash.has(languageId) && lineText.startsWith('/*', i) ? '/*' : html.has(languageId) && lineText.startsWith('<!--', i) ? '<!--' : null;
    if (opener) {
      const closer = opener === '/*' ? '*/' : '-->', end = lineText.indexOf(closer, i + opener.length);
      spans.push({ start: i, end: end < 0 ? lineText.length : end + closer.length });
      i = end < 0 ? lineText.length : end + closer.length;
    } else i++;
  }
  const matches: { tag: TodoTag; start: number; end: number }[] = [];
  const tags = /(?<![\p{L}\p{N}_])(TODO|FIXME|HACK)(?![\p{L}\p{N}_]):?/gu;
  for (const match of lineText.matchAll(tags)) {
    const start = match.index!;
    if (spans.some(span => start >= span.start && start + match[0].length <= span.end)) {
      matches.push({ tag: match[1] as TodoTag, start, end: start + match[0].length });
    }
  }
  return matches;
}

/** A safe CSS value only. Fixed declaration separators are supplied by the caller. */
export function markerImage(tag: unknown): string | null {
  if (typeof tag !== 'string' || !Object.hasOwn(TODO_COLORS, tag)) return null;
  const fill = TODO_COLORS[tag as TodoTag].marker;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 24" preserveAspectRatio="none"><path d="M1 5L26 3 51 5 76 2 99 5 98 20 73 22 49 20 24 22 2 19Z" fill="${fill}" fill-opacity=".62"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
