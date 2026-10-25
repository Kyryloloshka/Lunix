import { Decimal } from '../../decimal';
import { formatCurrency, formatDecimal } from '../formatDecimal';
import * as formatters from '..';

// Any pictographic emoji (🧠, ⚡, 💰 …). Resource identity is drawn by the UI, not by the string.
const EMOJI = /\p{Extended_Pictographic}/u;

describe('formatDecimal', () => {
  test('formats zero', () => {
    expect(formatDecimal(Decimal.ZERO)).toBe('0');
  });

  test('formats small numbers (< 1000)', () => {
    expect(formatDecimal(Decimal.from(42))).toBe('42');
    expect(formatDecimal(Decimal.from(999))).toBe('999');
  });

  test('formats thousands', () => {
    expect(formatDecimal(Decimal.from(1500))).toBe('1.50K');
  });

  test('formats millions, billions, trillions', () => {
    expect(formatDecimal(Decimal.from(1.25e6))).toBe('1.25M');
    expect(formatDecimal(Decimal.from(4.8e9))).toBe('4.80B');
    expect(formatDecimal(Decimal.from(12.5e12))).toBe('12.50T');
  });

  test('formats scientific notation beyond defined suffixes', () => {
    const huge = new Decimal(3.14, 100);
    expect(formatDecimal(huge)).toBe('3.14e100');
  });

  test('supports explicit scientific notation mode', () => {
    expect(formatDecimal(Decimal.from(1500), { notation: 'scientific' })).toBe('1.50e3');
    expect(formatDecimal(Decimal.from(2500000), { notation: 'scientific' })).toBe('2.50e6');
  });

  test('formatCurrency prepends dollar sign', () => {
    expect(formatCurrency(Decimal.from(1000))).toBe('$1.00K');
  });

  test('formatted values never contain emoji, in any notation or magnitude', () => {
    const values = [
      Decimal.ZERO,
      Decimal.from(0.5),
      Decimal.from(42),
      Decimal.from(50000),
      Decimal.from(1e6),
      new Decimal(3.14, 100),
      new Decimal(9.99, 400),
    ];
    for (const value of values) {
      for (const notation of ['compact', 'scientific'] as const) {
        expect(formatDecimal(value, { notation })).not.toMatch(EMOJI);
        expect(formatCurrency(value, { notation })).not.toMatch(EMOJI);
      }
    }
    expect(formatDecimal(Decimal.from(50000), { notation: 'compact' })).toBe('50.00K');
  });

  test('public API exposes no per-resource emoji formatters', () => {
    expect(Object.keys(formatters).sort()).toEqual(['formatCurrency', 'formatDecimal']);
  });
});
