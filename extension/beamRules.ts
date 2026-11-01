export interface Point { line: number; character: number }
export interface Span { start: Point; end: Point }
interface Item { uri: { toString(): string } | string; selectionRange: Span }
interface Incoming { from: { uri: { toString(): string } | string }; fromRanges: readonly Span[] }
export interface Beam { from: number; to: number }

export function onDefinition(cursor: Point, uri: string, item: Item): boolean {
  const { start, end } = item.selectionRange;
  return item.uri.toString() === uri &&
    (cursor.line > start.line || cursor.line === start.line && cursor.character >= start.character) &&
    (cursor.line < end.line || cursor.line === end.line && cursor.character <= end.character);
}

export function beamPairs(cursor: Point, uri: string, item: Item | undefined, incoming: readonly Incoming[] = []): Beam[] {
  if (!item || item.uri.toString() !== uri) return [];
  const to = item.selectionRange.start.line + 1;
  const calls = onDefinition(cursor, uri, item)
    ? incoming.filter(call => call.from.uri.toString() === uri && call.fromRanges.length).map(call => call.fromRanges[0].start.line + 1)
    : [cursor.line + 1];
  return [...new Set(calls)].filter(from => from !== to && [from, to].every(line =>
    Number.isInteger(line) && line > 0 && line <= 9999999)).sort((a, b) =>
    Math.abs(a - cursor.line - 1) - Math.abs(b - cursor.line - 1) || a - b).slice(0, 5).map(from => ({ from, to }));
}
