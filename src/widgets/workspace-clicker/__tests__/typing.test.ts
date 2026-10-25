import {
  BASE_CHARS_PER_TAP,
  INITIAL_CURSOR,
  MAX_CHARS_PER_TAP,
  advanceCursor,
  getCharsPerTap,
  getVisibleLines,
  pickKeyIndex,
} from '../model/typing';

const LINES = ['abcdef', '', 'xyz'];

describe('editor typing model (T-009)', () => {
  it('types characters within a line on each tap', () => {
    expect(advanceCursor(LINES, INITIAL_CURSOR, 4)).toEqual({ line: 0, column: 4 });
    expect(advanceCursor(LINES, { line: 0, column: 4 }, 2)).toEqual({ line: 0, column: 6 });
  });

  it('spends one character on each line break, including empty lines', () => {
    // 2 left on line 0, the break to line 1, the break to line 2, one char of "xyz"
    expect(advanceCursor(LINES, { line: 0, column: 4 }, 5)).toEqual({ line: 2, column: 1 });
    expect(advanceCursor(LINES, { line: 0, column: 6 }, 1)).toEqual({ line: 1, column: 0 });
  });

  it('wraps to an empty editor after the last line', () => {
    expect(advanceCursor(LINES, { line: 2, column: 3 }, 1)).toEqual(INITIAL_CURSOR);
    expect(advanceCursor(LINES, { line: 2, column: 1 }, 50)).toEqual(INITIAL_CURSOR);
  });

  it('recovers from invalid input', () => {
    expect(advanceCursor([], { line: 3, column: 2 }, 4)).toEqual(INITIAL_CURSOR);
    // A cursor from a longer snippet restarts on the new one
    expect(advanceCursor(LINES, { line: 9, column: 0 }, 2)).toEqual({ line: 0, column: 2 });
    expect(advanceCursor(LINES, { line: 0, column: 2 }, Number.NaN)).toEqual({ line: 0, column: 2 });
    expect(advanceCursor(LINES, { line: 0, column: 2 }, -3)).toEqual({ line: 0, column: 2 });
  });

  it('types faster by the real Flow/crit multiplier, bounded', () => {
    expect(getCharsPerTap(1)).toBe(BASE_CHARS_PER_TAP);
    expect(getCharsPerTap(2)).toBe(BASE_CHARS_PER_TAP * 2);
    expect(getCharsPerTap(3)).toBe(BASE_CHARS_PER_TAP * 3);
    expect(getCharsPerTap(1e6)).toBe(MAX_CHARS_PER_TAP);
    expect(getCharsPerTap(0)).toBe(BASE_CHARS_PER_TAP);
    expect(getCharsPerTap(Number.NaN)).toBe(BASE_CHARS_PER_TAP);
  });

  it('shows the last lines up to the cursor, with the current line partially typed', () => {
    const lines = ['l1', 'l2', 'l3', 'line4'];
    expect(getVisibleLines(lines, { line: 3, column: 2 }, 2)).toEqual([
      { number: 3, text: 'l3', isCurrent: false },
      { number: 4, text: 'li', isCurrent: true },
    ]);
    expect(getVisibleLines(lines, INITIAL_CURSOR, 6)).toEqual([{ number: 1, text: '', isCurrent: true }]);
    expect(getVisibleLines([], INITIAL_CURSOR, 6)).toEqual([]);
    expect(getVisibleLines(lines, { line: 1, column: 1 }, 0)).toEqual([{ number: 2, text: 'l', isCurrent: true }]);
  });

  it('lights a key in range and never the same key twice in a row', () => {
    expect(pickKeyIndex(0, 15, -1)).toBe(0);
    expect(pickKeyIndex(0.999, 15, -1)).toBe(14);
    expect(pickKeyIndex(0, 15, 0)).toBe(1);
    expect(pickKeyIndex(0.999, 15, 14)).toBe(0);
    expect(pickKeyIndex(Number.NaN, 15, -1)).toBe(0);
    expect(pickKeyIndex(5, 15, -1)).toBe(14);
    expect(pickKeyIndex(0.5, 0, -1)).toBe(0);
    expect(pickKeyIndex(0.5, 1, 0)).toBe(0);
  });
});
