/*
 * Pure decision logic for typing motion. This module has no VS Code imports,
 * so every rule can be unit tested with plain Node.js.
 */

/** The parts of a VS Code content change that the rules need. Offsets are UTF-16 code units. */
export interface TextChange {
  readonly rangeOffset: number;
  readonly rangeLength: number;
  readonly text: string;
}

/** Text to animate, located in the document as it exists after the edit. */
export interface MotionSpan {
  readonly start: number;
  readonly length: number;
}

export type MotionStyle = 'rise' | 'fade';

/** Name shared by the decoration CSS and the optional workbench patch. */
export const RISE_KEYFRAMES = 'white-flow-type-in';
export const DEFAULT_DURATION_MS = 140;
export const MIN_DURATION_MS = 80;
export const MAX_DURATION_MS = 300;
/** Opacity frames used when only the supported decoration API is available. */
export const FADE_OPACITIES: readonly string[] = ['0.3', '0.55', '0.8'];

/** Longest insertion still treated as typing. Covers committed IME words such as two or three CJK characters. */
export const MAX_TYPED_CODE_POINTS = 4;
/** Larger multi-cursor edits are treated as bulk edits rather than typing. */
export const MAX_SIMULTANEOUS_EDITS = 16;
/** An IME commit replaces its own composition text, which is short. */
const MAX_REPLACED_LENGTH = 32;
const AUTO_CLOSED_PAIRS = new Set(['()', '[]', '{}', '""', "''", '``', '<>']);
const LINE_BREAK = /[\r\n]/;
const BLANK = /^[ \t]+$/;
const NON_ASCII = /[^\x00-\x7f]/;

/**
 * Returns the part of one change that should animate, or null.
 *
 * - Plain insertions of up to four code points animate (normal typing).
 * - Line breaks, long insertions, and blank text never animate (bulk paste, Enter, indentation).
 * - An auto-closed pair such as "()" animates only its first character, the one the user typed.
 * - A replacement animates only when it inserts non-ASCII text. That is how an input method
 *   commits a word: Pinyin letters are replaced by the chosen characters. ASCII replacements
 *   (composition updates, completions, renames) stay still.
 */
export function animatedText(change: TextChange): string | null {
  const { text, rangeLength } = change;
  if (text.length === 0 || text.length > MAX_TYPED_CODE_POINTS * 2 || LINE_BREAK.test(text) || BLANK.test(text)) return null;
  const points = Array.from(text);
  if (points.length > MAX_TYPED_CODE_POINTS) return null;
  if (rangeLength > 0) {
    return rangeLength <= MAX_REPLACED_LENGTH && NON_ASCII.test(text) ? text : null;
  }
  if (AUTO_CLOSED_PAIRS.has(text)) return points[0];
  return text;
}

/**
 * Maps the changes of one document event to spans in the edited document.
 * VS Code reports change ranges in pre-edit coordinates, so each start is shifted
 * by the size difference of every earlier change.
 */
export function motionSpans(changes: readonly TextChange[]): MotionSpan[] {
  if (changes.length === 0 || changes.length > MAX_SIMULTANEOUS_EDITS) return [];
  const ordered = [...changes].sort((a, b) => a.rangeOffset - b.rangeOffset);
  const spans: MotionSpan[] = [];
  let shift = 0;
  for (const change of ordered) {
    const part = animatedText(change);
    if (part !== null) spans.push({ start: change.rangeOffset + shift, length: part.length });
    shift += change.text.length - change.rangeLength;
  }
  return spans;
}

export function clampDuration(value: unknown): number {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : DEFAULT_DURATION_MS;
  return Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, Math.round(number)));
}

/** Rise is an enhancement: every non-fade preference falls back when keyframes are absent. */
export function resolveStyle(setting: unknown, patchProvidesKeyframes: boolean): MotionStyle {
  if (setting === 'fade') return 'fade';
  return patchProvidesKeyframes ? 'rise' : 'fade';
}

/**
 * CSS for the rise decoration. VS Code writes a decoration's textDecoration value into
 * "text-decoration:<value>;", so extra declarations can follow "none;".
 *
 * position: relative moves the glyph without changing layout: neighbours keep their places
 * and the horizontal position the editor uses for the cursor and clicks never changes.
 * (transform would do nothing here, because token spans are inline elements.)
 */
export function riseDeclaration(durationMs: number): string {
  return `none; position: relative; animation: ${RISE_KEYFRAMES} ${clampDuration(durationMs)}ms cubic-bezier(.25, .6, .3, 1) both`;
}
