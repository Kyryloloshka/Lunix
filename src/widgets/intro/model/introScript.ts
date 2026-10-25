/** Intro screens in order; each is an i18n key. The last one ends with the first instruction. */
export const INTRO_LINE_KEYS = [
  'onboarding.intro.line1',
  'onboarding.intro.line2',
  'onboarding.intro.line3',
] as const;

/** Terminal typing speed. 3 lines of ~70 characters stay well under the 15 s budget. */
export const TYPING_CHARS_PER_SECOND = 50;
export const TYPING_TICK_MS = 40;

/** Characters added per timer tick. */
export const CHARS_PER_TICK = Math.max(1, Math.round((TYPING_CHARS_PER_SECOND * TYPING_TICK_MS) / 1000));

/** How many characters are visible: everything under reduced motion, otherwise a clamped step forward. */
export function nextVisibleLength(current: number, total: number, reducedMotion: boolean): number {
  const safeTotal = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  if (reducedMotion) return safeTotal;
  const safeCurrent = Number.isFinite(current) ? Math.max(0, Math.floor(current)) : 0;
  return Math.min(safeTotal, safeCurrent + CHARS_PER_TICK);
}

export type IntroTapAction = 'reveal' | 'next' | 'finish';

/** What a tap on the intro does: finish typing the line first, then advance, then close on the last line. */
export function getIntroTapAction(lineIndex: number, lineCount: number, isLineComplete: boolean): IntroTapAction {
  if (!isLineComplete) return 'reveal';
  return lineIndex >= lineCount - 1 ? 'finish' : 'next';
}
