/**
 * Design Tokens — Terminal Workbench
 * A restrained dark system built around developer tools: graphite, paper, phosphor.
 * No gradients, no emoji-driven UI, no generic neon dashboard treatment.
 */

export const colors = {
  bg: {
    app: '#0b0d0f',
    surface: '#111416',
    elevated: '#171b1e',
    subtle: '#0e1113',
    inset: '#080a0b',
  },
  border: {
    subtle: '#1e2528',
    default: '#2a3337',
    active: '#455257',
    highlight: '#68777c',
  },
  text: {
    primary: '#e6e8e6',
    secondary: '#a5afad',
    muted: '#697573',
    inverse: '#0b0d0f',
  },
  accent: {
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
    redBg: 'rgba(216, 111, 105, 0.12)',

    // Temporary semantic aliases retained while feature widgets migrate to the palette above.
    green: '#b8e986',
    greenLight: '#d8ffae',
    greenMuted: '#6f9254',
    greenBg: 'rgba(184, 233, 134, 0.10)',
    indigo: '#9f91bc',
    indigoLight: '#c2b7d9',
    indigoMuted: '#49445a',
    indigoBg: 'rgba(159, 145, 188, 0.11)',
    rose: '#c47c67',
    roseLight: '#e19a83',
    roseMuted: '#654237',
    roseBg: 'rgba(196, 124, 103, 0.11)',
    gold: '#d6a95d',
    goldLight: '#f0c77b',
    goldMuted: '#625033',
    goldBg: 'rgba(214, 169, 93, 0.11)',
    amberLight: '#f0c77b',
    redLight: '#e58b85',
  },
} as const;

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

export const typography = {
  display: 'monospace',
  mono: 'monospace',
  sizes: {
    xxs: 9,
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 30,
    giant: 38,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    black: '900',
  } as const,
} as const;

export const shadows = {
  low: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 5,
  },
} as const;

export const theme = {
  colors,
  spacing,
  radii,
  typography,
  shadows,
} as const;

export type Theme = typeof theme;
