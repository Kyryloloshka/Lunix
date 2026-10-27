import { getLocale, setLocale, t, type Locale } from '@shared/i18n';
import { FILLED_BUTTON_TONES } from '../../ui/Button';
import { glyphSymbols } from '../../ui/DevGlyph';
import {
  baseTheme,
  colors,
  contrastRatio,
  createRankTheme,
  getRankTheme,
  MIN_READABLE_FONT_SIZE,
  MIN_TEXT_CONTRAST,
  RANK_ACCENT_OVERLAYS,
  resources,
  typography,
} from '@shared/theme';

const TEXT_TOKENS = ['primary', 'secondary', 'muted'] as const;

function allSurfaces(): string[] {
  const base = Object.values(colors.surface);
  const rank = RANK_ACCENT_OVERLAYS.flatMap((overlay) => Object.values(overlay.surface));
  return [...base, ...rank];
}

describe('semantic color tokens', () => {
  it.each(TEXT_TOKENS)('text.%s reaches 4.5:1 on every surface, including rank tints', (token) => {
    for (const surface of allSurfaces()) {
      expect(contrastRatio(colors.text[token], surface)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    }
  });

  it('text.onAccent reaches 4.5:1 on every filled accent/feedback/resource background', () => {
    const fills = [
      colors.accent.violet,
      colors.accent.phosphor,
      colors.accent.amber,
      colors.accent.cyan,
      colors.accent.rust,
      colors.feedback.success,
      colors.feedback.warning,
      colors.feedback.danger,
      ...Object.values(resources).map((resource) => resource.color),
    ];
    for (const fill of fills) {
      expect(contrastRatio(colors.text.onAccent, fill)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    }
  });

  it('feedback, focus and resource colors are readable as text on base and raised surfaces', () => {
    const foregrounds = [
      colors.feedback.success,
      colors.feedback.warning,
      colors.feedback.danger,
      colors.focus,
      ...Object.values(resources).map((resource) => resource.color),
    ];
    for (const fg of foregrounds) {
      for (const surface of [colors.surface.base, colors.surface.raised, colors.surface.overlay]) {
        expect(contrastRatio(fg, surface)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
      }
    }
  });

  it('Button filled tones use text.onAccent, readable on their own fill', () => {
    // Regression: primary used #ffffff on #9f91bc, 2.9:1.
    expect(contrastRatio('#ffffff', colors.accent.violet)).toBeLessThan(MIN_TEXT_CONTRAST);
    expect(FILLED_BUTTON_TONES.has('primary')).toBe(true);
    expect(FILLED_BUTTON_TONES.has('danger')).toBe(true);
    expect(contrastRatio(colors.text.onAccent, colors.feedback.warning)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    expect(contrastRatio(colors.text.onAccent, colors.feedback.danger)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it('no longer exposes the legacy green/indigo/rose/gold aliases', () => {
    const legacy = Object.keys(colors.accent).filter((key) => /^(green|indigo|rose|gold)/.test(key));
    // Consumers cannot reference them either: `colors` is `as const`, so ts:check fails on a removed key.
    expect(legacy).toEqual([]);
  });
});

describe('resource identity tokens', () => {
  const entries = Object.entries(resources);

  it('every resource has its own glyph and color (Influence is not Flow)', () => {
    const glyphs = entries.map(([, resource]) => resource.glyph);
    const tones = entries.map(([, resource]) => resource.color);
    expect(new Set(glyphs).size).toBe(glyphs.length);
    expect(new Set(tones).size).toBe(tones.length);
    expect(resources.influence.glyph).not.toBe(resources.flow.glyph);
  });

  it('every glyph is a known DevGlyph name', () => {
    for (const [, resource] of entries) {
      expect(glyphSymbols).toHaveProperty(resource.glyph);
    }
  });

  it('every label key resolves in all locales', () => {
    const initial = getLocale();
    try {
      for (const locale of ['uk', 'en', 'es'] as Locale[]) {
        setLocale(locale);
        for (const [, resource] of entries) {
          expect(t(resource.labelKey)).not.toBe(resource.labelKey);
        }
      }
    } finally {
      setLocale(initial);
    }
  });
});

describe('typography scale', () => {
  it('has no readable size below 11pt', () => {
    expect(MIN_READABLE_FONT_SIZE).toBeGreaterThanOrEqual(11);
    for (const size of Object.values(typography.sizes)) {
      expect(size).toBeGreaterThanOrEqual(MIN_READABLE_FONT_SIZE);
    }
    for (const role of Object.values(typography.roles)) {
      expect(role.fontSize).toBeGreaterThanOrEqual(MIN_READABLE_FONT_SIZE);
      if ('lineHeight' in role) expect(role.lineHeight).toBeGreaterThanOrEqual(role.fontSize);
    }
  });

  it('defines the required roles, with tabular digits for counters', () => {
    expect(Object.keys(typography.roles).sort()).toEqual(['body', 'display', 'label', 'monoNum', 'title']);
    expect(typography.roles.monoNum.fontVariant).toContain('tabular-nums');
  });
});

describe('theme object and rank accent overlay', () => {
  it('getRankTheme clamps and normalizes the rank', () => {
    expect(getRankTheme(-5)).toEqual(getRankTheme(0));
    expect(getRankTheme(Number.NaN)).toEqual(getRankTheme(0));
    expect(getRankTheme(999)).toEqual(getRankTheme(RANK_ACCENT_OVERLAYS.length - 1));
    expect(getRankTheme(2.7)).toEqual(getRankTheme(2));
  });

  it('getRankTheme keeps the legacy flat shape derived from the overlay', () => {
    const overlay = RANK_ACCENT_OVERLAYS[2];
    expect(getRankTheme(2)).toEqual({
      appBackground: overlay.surface.base,
      heroBackground: overlay.surface.sunken,
      surfaceTint: overlay.surface.raised,
      border: overlay.border,
      accent: overlay.accent.primary,
      accentBright: overlay.accent.bright,
      accentBackground: overlay.accent.bg,
    });
  });

  it('createRankTheme overlays accent and surfaces without mutating the base theme', () => {
    const before = JSON.stringify(baseTheme);
    const ranked = createRankTheme(4);
    const overlay = RANK_ACCENT_OVERLAYS[4];

    expect(ranked.accent).toEqual(overlay.accent);
    expect(ranked.colors.surface.base).toBe(overlay.surface.base);
    expect(ranked.colors.surface.raised).toBe(overlay.surface.raised);
    expect(ranked.colors.border.active).toBe(overlay.border);
    // Untouched tokens come from the base theme.
    expect(ranked.colors.text).toEqual(baseTheme.colors.text);
    expect(ranked.resources).toBe(baseTheme.resources);
    expect(ranked.colors.surface.inset).toBe(baseTheme.colors.surface.inset);
    expect(JSON.stringify(baseTheme)).toBe(before);
  });
});
