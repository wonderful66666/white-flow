export type TrailState = ReadonlyMap<number, number>;
export interface TrailChange { startLine: number; endLine: number; lineBreaks: number; startCharacter?: number }
export const TRAIL_CAP = 2000;

export function countLineBreaks(text: string): number {
  let breaks = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\r') { breaks++; if (text[i + 1] === '\n') i++; }
    else if (text[i] === '\n') breaks++;
  }
  return breaks;
}

function cap(state: Map<number, number>): Map<number, number> {
  return state.size <= TRAIL_CAP ? state : new Map([...state].sort((a, b) => b[1] - a[1] || b[0] - a[0]).slice(0, TRAIL_CAP));
}

export function applyChange(state: TrailState, change: TrailChange, now: number): Map<number, number> {
  const { startLine: start, endLine: end, lineBreaks } = change;
  if (![start, end, lineBreaks].every(Number.isInteger) || start < 0 || end < start || lineBreaks < 0) return new Map(state);
  const delta = lineBreaks - (end - start), next = new Map<number, number>();
  for (const [line, time] of state) {
    if (line < start) next.set(line, time);
    else if (line > end) next.set(line + delta, time);
  }
  // A huge paste must not allocate a mark for every line before the cap is applied.
  for (let line = Math.max(start, start + lineBreaks - TRAIL_CAP + 1); line <= start + lineBreaks; line++) next.set(line, now);
  return cap(next);
}

export function applyChanges(state: TrailState, changes: readonly TrailChange[], now: number): Map<number, number> {
  let next = new Map(state);
  for (const change of [...changes].sort((a, b) => b.startLine - a.startLine || (b.startCharacter || 0) - (a.startCharacter || 0))) {
    next = applyChange(next, change, now);
  }
  return next;
}

export function bucket(age: number, minutes: number): 0 | 1 | 2 | null {
  const fraction = Math.max(0, age) / (minutes * 60000);
  return fraction < .2 ? 0 : fraction < .5 ? 1 : fraction < 1 ? 2 : null;
}

export function prune(state: TrailState, now: number, minutes: number): Map<number, number> {
  return cap(new Map([...state].filter(([, time]) => bucket(now - time, minutes) !== null)));
}

export function recentLines(state: TrailState): number[] {
  return [...state].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([line]) => line);
}
