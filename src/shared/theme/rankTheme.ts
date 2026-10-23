import { colors } from './tokens';

export interface RankTheme {
  appBackground: string;
  heroBackground: string;
  surfaceTint: string;
  border: string;
  accent: string;
  accentBright: string;
  accentBackground: string;
}

const RANK_THEMES: readonly RankTheme[] = [
  {
    appBackground: '#0b0d0f',
    heroBackground: '#0e1113',
    surfaceTint: '#111416',
    border: colors.border.active,
    accent: colors.accent.phosphor,
    accentBright: colors.accent.phosphorBright,
    accentBackground: colors.accent.phosphorBg,
  },
  {
    appBackground: '#0b100e',
    heroBackground: '#0d1410',
    surfaceTint: '#111815',
    border: colors.accent.phosphorDim,
    accent: colors.accent.phosphor,
    accentBright: colors.accent.phosphorBright,
    accentBackground: colors.accent.phosphorBg,
  },
  {
    appBackground: '#0a1011',
    heroBackground: '#0d1617',
    surfaceTint: '#10191a',
    border: colors.accent.cyan,
    accent: colors.accent.cyan,
    accentBright: colors.accent.cyanBright,
    accentBackground: colors.accent.cyanBg,
  },
  {
    appBackground: '#11100c',
    heroBackground: '#18150e',
    surfaceTint: '#1a1710',
    border: colors.accent.amber,
    accent: colors.accent.amber,
    accentBright: colors.accent.amberBright,
    accentBackground: colors.accent.amberBg,
  },
  {
    appBackground: '#100f14',
    heroBackground: '#15131b',
    surfaceTint: '#181621',
    border: colors.accent.violet,
    accent: colors.accent.violet,
    accentBright: colors.accent.violetBright,
    accentBackground: colors.accent.violetBg,
  },
  {
    appBackground: '#15100e',
    heroBackground: '#1b1510',
    surfaceTint: '#211712',
    border: colors.accent.rust,
    accent: colors.accent.rust,
    accentBright: colors.accent.rustBright,
    accentBackground: colors.accent.rustBg,
  },
  {
    appBackground: '#0b110d',
    heroBackground: '#101911',
    surfaceTint: '#141d15',
    border: colors.accent.phosphorBright,
    accent: colors.accent.phosphor,
    accentBright: colors.accent.phosphorBright,
    accentBackground: colors.accent.phosphorBg,
  },
  {
    appBackground: '#0a1113',
    heroBackground: '#0e191c',
    surfaceTint: '#111e21',
    border: colors.accent.cyanBright,
    accent: colors.accent.cyan,
    accentBright: colors.accent.cyanBright,
    accentBackground: colors.accent.cyanBg,
  },
  {
    appBackground: '#15120b',
    heroBackground: '#1e190d',
    surfaceTint: '#241d0e',
    border: colors.accent.amberBright,
    accent: colors.accent.amber,
    accentBright: colors.accent.amberBright,
    accentBackground: colors.accent.amberBg,
  },
];

export function getRankTheme(rank: number): RankTheme {
  const normalizedRank = Number.isFinite(rank) ? Math.floor(rank) : 0;
  return RANK_THEMES[Math.min(RANK_THEMES.length - 1, Math.max(0, normalizedRank))];
}
