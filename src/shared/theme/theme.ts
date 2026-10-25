import { colors, radii, resources, shadows, spacing, typography } from './tokens';
import { getRankAccentOverlay, type RankAccentOverlay } from './rankTheme';

type Widen<T> = T extends string ? string : T extends object ? { [K in keyof T]: Widen<T[K]> } : T;

/** Color tokens a theme may remap (IDE-style cosmetic themes, rank accents). */
export type ThemeColors = Widen<typeof colors>;

export interface ThemeAccent {
  primary: string;
  bright: string;
  bg: string;
}

/**
 * A complete theme: a plain object of tokens. Swapping the object (future `ThemeProvider`,
 * E15 cosmetic themes) re-skins every consumer that reads from it.
 */
export interface Theme {
  colors: ThemeColors;
  /** Brand accent; a rank overlay changes it. */
  accent: ThemeAccent;
  resources: typeof resources;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  shadows: typeof shadows;
}

export const baseTheme: Theme = {
  colors,
  accent: {
    primary: colors.accent.phosphor,
    bright: colors.accent.phosphorBright,
    bg: colors.accent.phosphorBg,
  },
  resources,
  spacing,
  radii,
  typography,
  shadows,
};

/** @deprecated use `baseTheme` (or `createRankTheme`). */
export const theme = baseTheme;

/** Pure: returns a new theme with the overlay's surfaces, border and accent applied. */
export function applyAccentOverlay(base: Theme, overlay: RankAccentOverlay): Theme {
  const surface = {
    ...base.colors.surface,
    base: overlay.surface.base,
    sunken: overlay.surface.sunken,
    raised: overlay.surface.raised,
  };
  return {
    ...base,
    accent: { ...overlay.accent },
    colors: {
      ...base.colors,
      surface,
      bg: {
        ...base.colors.bg,
        app: surface.base,
        subtle: surface.sunken,
        surface: surface.raised,
      },
      border: { ...base.colors.border, active: overlay.border },
    },
  };
}

/** Base theme with the accent overlay of a career rank. */
export function createRankTheme(rank: number, base: Theme = baseTheme): Theme {
  return applyAccentOverlay(base, getRankAccentOverlay(rank));
}
