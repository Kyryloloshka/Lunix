import { colors, palette } from './tokens';

/**
 * Accent overlay applied on top of the base theme for a career rank.
 * It only tints surfaces and swaps the accent; text, feedback and resource tokens stay the same.
 */
export interface RankAccentOverlay {
  surface: {
    /** Replaces `surface.base` (app background). */
    base: string;
    /** Replaces `surface.sunken` (hero area). */
    sunken: string;
    /** Replaces `surface.raised` (tinted panels). */
    raised: string;
  };
  border: string;
  accent: {
    primary: string;
    bright: string;
    bg: string;
  };
}

/** Flat legacy shape consumed by widgets. Derived from the overlay. */
export interface RankTheme {
  appBackground: string;
  heroBackground: string;
  surfaceTint: string;
  border: string;
  accent: string;
  accentBright: string;
  accentBackground: string;
}

const PHOSPHOR = { primary: palette.phosphor, bright: palette.phosphorBright, bg: palette.phosphorBg };
const CYAN = { primary: palette.cyan, bright: palette.cyanBright, bg: palette.cyanBg };
const AMBER = { primary: palette.amber, bright: palette.amberBright, bg: palette.amberBg };
const VIOLET = { primary: palette.violet, bright: palette.violetBright, bg: palette.violetBg };
const RUST = { primary: palette.rust, bright: palette.rustBright, bg: palette.rustBg };

export const RANK_ACCENT_OVERLAYS: readonly RankAccentOverlay[] = [
  { surface: { base: '#0b0d0f', sunken: '#0e1113', raised: '#111416' }, border: colors.border.active, accent: PHOSPHOR },
  { surface: { base: '#0b100e', sunken: '#0d1410', raised: '#111815' }, border: palette.phosphorDim, accent: PHOSPHOR },
  { surface: { base: '#0a1011', sunken: '#0d1617', raised: '#10191a' }, border: palette.cyan, accent: CYAN },
  { surface: { base: '#11100c', sunken: '#18150e', raised: '#1a1710' }, border: palette.amber, accent: AMBER },
  { surface: { base: '#100f14', sunken: '#15131b', raised: '#181621' }, border: palette.violet, accent: VIOLET },
  { surface: { base: '#15100e', sunken: '#1b1510', raised: '#211712' }, border: palette.rust, accent: RUST },
  { surface: { base: '#0b110d', sunken: '#101911', raised: '#141d15' }, border: palette.phosphorBright, accent: PHOSPHOR },
  { surface: { base: '#0a1113', sunken: '#0e191c', raised: '#111e21' }, border: palette.cyanBright, accent: CYAN },
  { surface: { base: '#15120b', sunken: '#1e190d', raised: '#241d0e' }, border: palette.amberBright, accent: AMBER },
];

export function getRankAccentOverlay(rank: number): RankAccentOverlay {
  const normalizedRank = Number.isFinite(rank) ? Math.floor(rank) : 0;
  return RANK_ACCENT_OVERLAYS[Math.min(RANK_ACCENT_OVERLAYS.length - 1, Math.max(0, normalizedRank))];
}

export function getRankTheme(rank: number): RankTheme {
  const overlay = getRankAccentOverlay(rank);
  return {
    appBackground: overlay.surface.base,
    heroBackground: overlay.surface.sunken,
    surfaceTint: overlay.surface.raised,
    border: overlay.border,
    accent: overlay.accent.primary,
    accentBright: overlay.accent.bright,
    accentBackground: overlay.accent.bg,
  };
}
