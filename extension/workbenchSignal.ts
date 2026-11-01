/* Pure, allowlisted declaration format for the optional renderer bridge. */
export type KeywordPalette = 'aurora' | 'spectrum';

export function signalDeclaration(state: unknown): string | null {
  if (state === null || typeof state !== 'object') return null;
  const { enabled, palette } = state as { enabled?: unknown; palette?: unknown };
  if (enabled !== true || (palette !== 'aurora' && palette !== 'spectrum')) return null;
  return `none; --white-flow-keyword-flow: ${palette}`;
}
