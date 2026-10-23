import { Decimal } from '../decimal';
import { useSettingsStore, type NumberNotation } from '@features/settings';

/**
 * Standard incremental game short suffixes.
 * Grouped in steps of 10^3 (thousands, millions, billions, ...).
 */
const SUFFIXES: string[] = [
  '',
  'K',   // 10^3
  'M',   // 10^6
  'B',   // 10^9
  'T',   // 10^12
  'Qa',  // 10^15 Quadrillion
  'Qi',  // 10^18 Quintillion
  'Sx',  // 10^21 Sextillion
  'Sp',  // 10^24 Septillion
  'Oc',  // 10^27 Octillion
  'No',  // 10^30 Nonillion
  'Dc',  // 10^33 Decillion
  'Ud',  // 10^36 Undecillion
  'Dd',  // 10^39 Duodecillion
  'Td',  // 10^42 Tredecillion
  'Qad', // 10^45 Quattuordecillion
  'Qid', // 10^48 Quindecillion
  'Sxd', // 10^51 Sexdecillion
  'Spd', // 10^54 Septendecillion
  'Ocd', // 10^57 Octodecillion
  'Nod', // 10^60 Novemdecillion
  'Vg',  // 10^63 Vigintillion
];

export interface FormatOptions {
  precision?: number;
  prefix?: string;
  suffix?: string;
  notation?: NumberNotation;
}

/**
 * Format a Decimal into a readable incremental string.
 * Supports user-selected 'compact' vs 'scientific' notation.
 */
export function formatDecimal(
  value: Decimal,
  options?: FormatOptions,
): string {
  const precision = options?.precision ?? 2;
  const prefix = options?.prefix ?? '';
  const suffix = options?.suffix ?? '';
  const activeNotation = options?.notation ?? useSettingsStore.getState().notation ?? 'compact';

  if (value.isZero()) {
    return `${prefix}0${suffix}`;
  }

  // Pure scientific notation when selected by the user
  if (activeNotation === 'scientific') {
    if (value.exponent < 3) {
      const num = value.toNumber();
      return `${prefix}${num < 10 && Math.floor(num) !== num ? num.toFixed(precision) : Math.floor(num)}${suffix}`;
    }
    return `${prefix}${value.mantissa.toFixed(precision)}e${value.exponent}${suffix}`;
  }

  const num = value.toNumber();

  // Decimals less than 10 (e.g. 0.5, 3.25)
  if (value.exponent < 1 && num < 10) {
    if (Math.floor(num) !== num) {
      return `${prefix}${num.toFixed(precision)}${suffix}`;
    }
    return `${prefix}${num}${suffix}`;
  }

  // Small numbers (< 1000)
  if (value.exponent < 3) {
    return `${prefix}${Math.floor(num)}${suffix}`;
  }

  const tier = Math.floor(value.exponent / 3);

  // If we have a named suffix
  if (tier < SUFFIXES.length) {
    const remainder = value.exponent % 3;
    const scaledMantissa = value.mantissa * 10 ** remainder;
    return `${prefix}${scaledMantissa.toFixed(precision)}${SUFFIXES[tier]}${suffix}`;
  }

  // Fallback to scientific notation beyond high tiers
  return `${prefix}${value.mantissa.toFixed(precision)}e${value.exponent}${suffix}`;
}

export function formatCurrency(value: Decimal, options?: FormatOptions): string {
  return formatDecimal(value, { ...options, prefix: '$' });
}

export function formatCognitive(value: Decimal, options?: FormatOptions): string {
  return formatDecimal(value, { ...options, suffix: ' 🧠' });
}

export function formatInfluence(value: Decimal, options?: FormatOptions): string {
  return formatDecimal(value, { ...options, suffix: ' ⚡' });
}
