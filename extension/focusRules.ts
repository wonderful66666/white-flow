export interface LineSpan { start: number; end: number }
interface SymbolShape {
  kind: number;
  range?: { start: { line: number }; end: { line: number } };
  location?: { range: { start: { line: number }; end: { line: number } } };
  children?: readonly SymbolShape[];
}

export function focusLines(symbols: readonly SymbolShape[] | undefined, cursorLine: number): LineSpan | null {
  let best: LineSpan | null = null;
  const pending = [...(symbols || []).slice(0, 100000)], seen = new Set<SymbolShape>();
  while (pending.length && seen.size < 100000) {
    const symbol = pending.pop()!;
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);
    if (Array.isArray(symbol.children)) for (const child of symbol.children) {
      if (pending.length + seen.size >= 100000) break;
      pending.push(child);
    }
    const range = symbol.range || symbol.location?.range;
    if (!range || ![5, 8, 11].includes(symbol.kind)) continue;
    const start = range.start.line, end = range.end.line;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start ||
      cursorLine < start || cursorLine > end) continue;
    if (!best || end - start < best.end - best.start) best = { start, end };
  }
  return best;
}

export function dimRanges(lineCount: number, focus: LineSpan | null): LineSpan[] {
  if (!focus || lineCount <= 0 || focus.start < 0 || focus.end >= lineCount || focus.end < focus.start) return [];
  const spans: LineSpan[] = [];
  if (focus.start > 0) spans.push({ start: 0, end: focus.start - 1 });
  if (focus.end < lineCount - 1) spans.push({ start: focus.end + 1, end: lineCount - 1 });
  return spans;
}
