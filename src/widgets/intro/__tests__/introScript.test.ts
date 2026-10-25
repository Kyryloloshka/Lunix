import en from '@shared/i18n/locales/en.json';
import es from '@shared/i18n/locales/es.json';
import uk from '@shared/i18n/locales/uk.json';
import {
  CHARS_PER_TICK,
  INTRO_LINE_KEYS,
  TYPING_CHARS_PER_SECOND,
  TYPING_TICK_MS,
  getIntroTapAction,
  nextVisibleLength,
} from '../model/introScript';

type Tree = { [key: string]: string | Tree };

function lookup(tree: Tree, key: string): string | undefined {
  const value = key.split('.').reduce<string | Tree | undefined>(
    (node, part) => (node && typeof node === 'object' ? node[part] : undefined),
    tree,
  );
  return typeof value === 'string' ? value : undefined;
}

describe('intro typing', () => {
  it('advances by a few characters per tick and never past the end', () => {
    expect(nextVisibleLength(0, 10, false)).toBe(CHARS_PER_TICK);
    expect(nextVisibleLength(9, 10, false)).toBe(10);
    expect(nextVisibleLength(10, 10, false)).toBe(10);
  });

  it('shows the whole text at once under reduced motion', () => {
    expect(nextVisibleLength(0, 70, true)).toBe(70);
  });

  it('survives invalid input', () => {
    expect(nextVisibleLength(Number.NaN, 5, false)).toBe(CHARS_PER_TICK);
    expect(nextVisibleLength(-4, 5, false)).toBe(CHARS_PER_TICK);
    expect(nextVisibleLength(0, Number.NaN, false)).toBe(0);
  });
});

describe('intro tap actions', () => {
  it('reveals first, then advances, then finishes on the last line', () => {
    expect(getIntroTapAction(0, 3, false)).toBe('reveal');
    expect(getIntroTapAction(0, 3, true)).toBe('next');
    expect(getIntroTapAction(2, 3, false)).toBe('reveal');
    expect(getIntroTapAction(2, 3, true)).toBe('finish');
  });
});

describe('intro script content', () => {
  const locales: Record<string, Tree> = { uk: uk as Tree, en: en as Tree, es: es as Tree };

  it.each(Object.keys(locales))('has every line in %s and fits the 15 second budget', (locale) => {
    const lines = INTRO_LINE_KEYS.map((key) => lookup(locales[locale], key));
    lines.forEach((line) => expect(typeof line === 'string' && line.length > 0).toBe(true));
    const totalChars = lines.reduce((sum, line) => sum + (line?.length ?? 0), 0);
    const typingSeconds = totalChars / TYPING_CHARS_PER_SECOND;
    // Typing time only; reading pauses are the player's own taps.
    expect(typingSeconds).toBeLessThan(8);
    expect(TYPING_TICK_MS).toBeGreaterThan(0);
  });
});
