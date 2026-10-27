/**
 * Design Tokens — Terminal Workbench
 * A restrained dark system built around developer tools: graphite, paper, phosphor.
 * No gradients, no emoji-driven UI, no generic neon dashboard treatment.
 *
 * Layers:
 * - `palette`: raw hues. Components should not read it directly.
 * - `colors`: semantic tokens (surface / text / border / feedback / focus / accent). Use these.
 * - `resources`: visual identity of each game resource (color, background, glyph, label key).
 * - `typography.roles`: text styles by role; every readable size is ≥ `MIN_READABLE_FONT_SIZE`.
 */

import { Platform, type TextStyle } from 'react-native';

/** Raw palette. Prefer semantic tokens in `colors`; the palette exists so themes can remap it. */
export const palette = {
  black: '#000000',
  graphite: {
    950: '#080a0b',
    900: '#0b0d0f',
    850: '#0e1113',
    800: '#111416',
    750: '#171b1e',
  },
  line: {
    subtle: '#1e2528',
    default: '#2a3337',
    active: '#455257',
    highlight: '#68777c',
  },
  paper: {
    primary: '#e6e8e6',
    secondary: '#a5afad',
    muted: '#7d8987',
  },
  phosphor: '#b8e986',
  phosphorBright: '#d8ffae',
  phosphorDim: '#6f9254',
  phosphorBg: 'rgba(184, 233, 134, 0.10)',
  amber: '#d6a95d',
  amberBright: '#f0c77b',
  amberBg: 'rgba(214, 169, 93, 0.11)',
  cyan: '#76b7b2',
  cyanBright: '#a0d9d2',
  cyanBg: 'rgba(118, 183, 178, 0.11)',
  rust: '#c47c67',
  rustBright: '#e19a83',
  rustBg: 'rgba(196, 124, 103, 0.11)',
  violet: '#9f91bc',
  violetBright: '#c2b7d9',
  violetBg: 'rgba(159, 145, 188, 0.11)',
  red: '#d86f69',
  redBright: '#e58b85',
  redBg: 'rgba(216, 111, 105, 0.12)',
} as const;

const surface = {
  /** App background. */
  base: palette.graphite[900],
  /** Cards, panels. */
  raised: palette.graphite[800],
  /** Elevated controls on top of a panel. */
  overlay: palette.graphite[750],
  /** Quiet areas inside a panel (secondary rows). */
  sunken: palette.graphite[850],
  /** Wells: progress tracks, editor body, stat plates. */
  inset: palette.graphite[950],
} as const;

const text = {
  primary: palette.paper.primary,
  secondary: palette.paper.secondary,
  /** Still readable: ≥ 4.5:1 on every surface (see contrast test). */
  muted: palette.paper.muted,
  /** Text on filled accent/feedback backgrounds (buttons, badges). */
  onAccent: palette.graphite[900],
} as const;

export const colors = {
  surface,
  text,
  border: {
    subtle: palette.line.subtle,
    default: palette.line.default,
    active: palette.line.active,
    highlight: palette.line.highlight,
  },
  feedback: {
    success: palette.phosphor,
    successBg: palette.phosphorBg,
    warning: palette.amber,
    warningBg: palette.amberBg,
    danger: palette.red,
    dangerBg: palette.redBg,
  },
  /** Shadow color for elevated surfaces. */
  shadow: palette.black,
  /** Focus ring for keyboard/switch navigation. */
  focus: palette.cyanBright,
  /**
   * Accent hues. Prefer `theme.accent` (rank-aware) for "brand" accent, `feedback.*` for state and
   * `resources.*` for resource identity; these raw hues remain for decorative use.
   */
  accent: {
    phosphor: palette.phosphor,
    phosphorBright: palette.phosphorBright,
    phosphorDim: palette.phosphorDim,
    phosphorBg: palette.phosphorBg,
    amber: palette.amber,
    amberBright: palette.amberBright,
    amberBg: palette.amberBg,
    cyan: palette.cyan,
    cyanBright: palette.cyanBright,
    cyanBg: palette.cyanBg,
    rust: palette.rust,
    rustBright: palette.rustBright,
    rustBg: palette.rustBg,
    violet: palette.violet,
    violetBright: palette.violetBright,
    violetBg: palette.violetBg,
    red: palette.red,
    redBright: palette.redBright,
    redBg: palette.redBg,
  },
} as const;

/**
 * Resource identity: one color + one glyph per resource across the whole app.
 * `glyph` is a `DevGlyph` name (validated in tests), `labelKey` an i18n key.
 */
export const resources = {
  capital: {
    color: palette.phosphor,
    bg: palette.phosphorBg,
    glyph: 'terminal',
    labelKey: 'resources.capital',
  },
  cognitive: {
    color: palette.cyanBright,
    bg: palette.cyanBg,
    glyph: 'brain',
    labelKey: 'resources.cognitive',
  },
  influence: {
    color: palette.rustBright,
    bg: palette.rustBg,
    glyph: 'trend',
    labelKey: 'resources.influence',
  },
  stress: {
    color: palette.red,
    bg: palette.redBg,
    glyph: 'flame',
    labelKey: 'resources.stress',
  },
  flow: {
    color: palette.amber,
    bg: palette.amberBg,
    glyph: 'bolt',
    labelKey: 'status.flow',
  },
} as const;

export type ResourceKind = keyof typeof resources;
export type ResourceToken = (typeof resources)[ResourceKind];

export const spacing = {
  xxs: 3,
  xs: 5,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  xs: 3,
  sm: 6,
  md: 9,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

/** Smallest font size allowed for any readable text (pt). */
export const MIN_READABLE_FONT_SIZE = 11;

/**
 * Brand mono font: JetBrains Mono (SIL Open Font License 1.1), loaded at app start by
 * `src/application/fonts` as ONE family with several weight faces (400/700/800), so `fontWeight`
 * picks the face on iOS, Android (API 29+) and web. JetBrains Mono has no 900 face; 900 renders
 * as the closest one (800).
 */
export const BRAND_MONO_FAMILY = 'JetBrainsMono';

/** Weights that have a real face in the loaded family. */
export const BRAND_MONO_WEIGHTS = [400, 700, 800] as const;

/**
 * On web the CSS stack falls back to the system monospace if the font didn't load. On native an
 * unloaded custom family falls back to the system font.
 */
const brandMono = Platform.OS === 'web' ? `${BRAND_MONO_FAMILY}, monospace` : BRAND_MONO_FAMILY;

const fontFamilies = {
  display: brandMono,
  mono: brandMono,
} as const;

const sizes = {
  xs: MIN_READABLE_FONT_SIZE,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  giant: 38,
} as const;

const weights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extraBold: '800',
  black: '900',
} as const;

/** Text styles by role. Spread into `StyleSheet.create` entries. */
const roles = {
  /** Big counters and hero numbers. */
  display: {
    fontFamily: fontFamilies.mono,
    fontWeight: weights.extraBold,
    fontSize: sizes.xxl,
    lineHeight: 36,
    fontVariant: ['tabular-nums'],
  },
  /** Panel and section titles. */
  title: {
    fontFamily: fontFamilies.mono,
    fontWeight: weights.extraBold,
    fontSize: sizes.lg,
    lineHeight: 26,
  },
  /** Running text, descriptions. */
  body: {
    fontSize: sizes.sm,
    lineHeight: 19,
    fontWeight: weights.regular,
  },
  /** Small caps-like labels, captions, eyebrows, chips. */
  label: {
    fontFamily: fontFamilies.mono,
    fontWeight: weights.bold,
    fontSize: sizes.xs,
    lineHeight: 15,
    letterSpacing: 0.6,
  },
  /** Counters and prices: tabular digits so values don't jump while ticking. */
  monoNum: {
    fontFamily: fontFamilies.mono,
    fontWeight: weights.extraBold,
    fontSize: sizes.sm,
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
  },
} satisfies Record<string, TextStyle>;

export type TypographyRole = keyof typeof roles;

export const typography = {
  ...fontFamilies,
  sizes,
  weights,
  roles,
} as const;

export const shadows = {
  low: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 5,
  },
} as const;
