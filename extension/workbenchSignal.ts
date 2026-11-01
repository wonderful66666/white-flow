/* Pure, allowlisted declaration format for the optional renderer bridge. */
export type KeywordPalette = 'aurora' | 'spectrum';

export const POLISH_EFFECTS = [
  { setting: 'engraved', token: 'engraved', label: 'Engraved', motion: false },
  { setting: 'stickyGlass', token: 'sticky-glass', label: 'Sticky Glass', motion: false },
  { setting: 'keycaps', token: 'keycaps', label: 'Keycaps', motion: false },
  { setting: 'backlight', token: 'backlight', label: 'Empty Editor Backlight', motion: false },
  { setting: 'toastStack', token: 'toast-stack', label: 'Toast Stack', motion: false },
  { setting: 'saveShine', token: 'save-shine', label: 'Save Shine', motion: true },
  { setting: 'celebrate', token: 'celebrate', label: 'Celebrate', motion: true },
  { setting: 'dock', token: 'dock', label: 'Activity Bar Dock', motion: true }
] as const;

export function polishDeclaration(tokens: unknown, reduceMotion = false): string | null {
  if (!Array.isArray(tokens) || tokens.some(token => typeof token !== 'string' ||
    !POLISH_EFFECTS.some(effect => effect.token === token))) return null;
  const allowed = [...new Set(tokens as string[])].filter(token =>
    !reduceMotion || !POLISH_EFFECTS.some(effect => effect.token === token && effect.motion)).sort();
  return allowed.length ? `none; --white-flow-polish: ${allowed.join(' ')}` : null;
}

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
