/**
 * Pure "typing" model of the Console editor (T-009): every tap types a few characters of the snippet,
 * finished lines scroll up, and the snippet starts over after its last line. No React, no clock.
 */

export interface TypingCursor {
  /** Index of the line being typed. */
  line: number;
  /** Characters of that line already typed. */
  column: number;
}

export const INITIAL_CURSOR: TypingCursor = { line: 0, column: 0 };

/** Characters a plain tap types. Flow and crit type faster by their real output multiplier. */
export const BASE_CHARS_PER_TAP = 4;
/** Upper bound so a huge multiplier cannot skip whole snippets in one tap. */
export const MAX_CHARS_PER_TAP = 24;

/** Characters typed by one tap with the given Flow/crit output multiplier (1 = no bonus). */
export function getCharsPerTap(multiplier: number): number {
  const safe = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
  return Math.min(MAX_CHARS_PER_TAP, Math.max(1, Math.round(BASE_CHARS_PER_TAP * safe)));
}

function isValidCursor(lines: readonly string[], cursor: TypingCursor): boolean {
  return Number.isInteger(cursor.line)
    && Number.isInteger(cursor.column)
    && cursor.line >= 0
    && cursor.line < lines.length
    && cursor.column >= 0
    && cursor.column <= lines[cursor.line].length;
}

/**
 * Moves the cursor by `chars` characters. The line break costs one character, so empty lines still take a
 * tap to pass. After the last line the snippet wraps to the start (a fresh, empty editor).
 */
export function advanceCursor(lines: readonly string[], cursor: TypingCursor, chars: number): TypingCursor {
  if (lines.length === 0) return INITIAL_CURSOR;
  let { line, column } = isValidCursor(lines, cursor) ? cursor : INITIAL_CURSOR;
  let remaining = Number.isFinite(chars) ? Math.max(0, Math.floor(chars)) : 0;

  while (remaining > 0) {
    const left = lines[line].length - column;
    if (left > 0) {
      const step = Math.min(left, remaining);
      column += step;
      remaining -= step;
      continue;
    }
    // At the end of the line: the line break moves to the next line, or wraps after the last one.
    remaining -= 1;
    if (line + 1 >= lines.length) return INITIAL_CURSOR;
    line += 1;
    column = 0;
  }
  return { line, column };
}

export interface VisibleLine {
  /** 1-based line number as shown in the gutter. */
  number: number;
  text: string;
  /** The line the cursor is on. */
  isCurrent: boolean;
}

/** The last `windowSize` lines up to the cursor: older lines scroll out of the top. */
export function getVisibleLines(lines: readonly string[], cursor: TypingCursor, windowSize: number): VisibleLine[] {
  if (lines.length === 0) return [];
  const safeCursor = isValidCursor(lines, cursor) ? cursor : INITIAL_CURSOR;
  const size = Number.isFinite(windowSize) ? Math.max(1, Math.floor(windowSize)) : 1;
  const first = Math.max(0, safeCursor.line - size + 1);
  const visible: VisibleLine[] = [];
  for (let index = first; index <= safeCursor.line; index += 1) {
    const isCurrent = index === safeCursor.line;
    visible.push({
      number: index + 1,
      text: isCurrent ? lines[index].slice(0, safeCursor.column) : lines[index],
      isCurrent,
    });
  }
  return visible;
}

/**
 * Which keyboard key lights up for a tap. `random` is in [0, 1); the same key never lights twice in a row,
 * so fast taps always look like different keys.
 */
export function pickKeyIndex(random: number, keyCount: number, previous: number): number {
  if (!Number.isInteger(keyCount) || keyCount <= 0) return 0;
  const safeRandom = Number.isFinite(random) ? Math.min(Math.max(random, 0), 0.999999) : 0;
  const index = Math.floor(safeRandom * keyCount);
  if (keyCount > 1 && index === previous) return (index + 1) % keyCount;
  return index;
}
