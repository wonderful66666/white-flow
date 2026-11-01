/* Pure, allowlisted declaration format for the optional renderer bridge. */
export type KeywordPalette = 'aurora' | 'spectrum';

export function signalDeclaration(state: unknown): string | null {
  if (state === null || typeof state !== 'object') return null;
  const { enabled, palette } = state as { enabled?: unknown; palette?: unknown };
  if (enabled !== true || (palette !== 'aurora' && palette !== 'spectrum')) return null;
  return `none; --white-flow-keyword-flow: ${palette}`;
}

export function mistDeclaration(state: unknown): string | null {
  if (!state || typeof state !== 'object') return null;
  const { enabled, drift, glow } = state as { enabled?: unknown; drift?: unknown; glow?: unknown };
  if (enabled !== true || !['drift', 'still'].includes(drift as string) || !['on', 'off'].includes(glow as string)) return null;
  return `none; --white-flow-line-mist: ${drift}; --white-flow-line-mist-glow: ${glow}`;
}

export function beamsDeclaration(pairs: unknown, revision: unknown, motion: unknown = 'on'): string | null {
  if (typeof pairs !== 'string' || pairs !== pairs.trim() || !/^\d{1,7}-\d{1,7}(,\d{1,7}-\d{1,7}){0,4}$/.test(pairs) ||
    typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 0 || revision > 9999999999 ||
    (motion !== 'on' && motion !== 'still')) return null;
  if (pairs.split(',').some(pair => pair.split('-').some(line => Number(line) < 1))) return null;
  return `none; --white-flow-beams: ${pairs}; --white-flow-beams-rev: ${revision}; --white-flow-beams-motion: ${motion}`;
}
