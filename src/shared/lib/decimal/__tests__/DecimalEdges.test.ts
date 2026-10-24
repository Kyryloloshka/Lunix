import { Decimal } from '../Decimal';

describe('Decimal edge cases', () => {
  it('raises to large powers without overflowing to zero', () => {
    const result = new Decimal(9, 0).pow(400);
    expect(result.isZero()).toBe(false);
    expect(result.exponent).toBe(381);
  });

  it('keeps the exponent an integer', () => {
    const value = new Decimal(2, 1.5);
    expect(Number.isInteger(value.exponent)).toBe(true);
    expect(value.toNumber()).toBeCloseTo(2 * 10 ** 1.5);
  });

  it('builds powers of ten from log10', () => {
    expect(Decimal.fromLog10(3).eq(1000)).toBe(true);
    expect(Decimal.fromLog10(500).exponent).toBe(500);
  });

  it('rejects malformed JSON', () => {
    expect(Decimal.fromJSON(null).isZero()).toBe(true);
    expect(Decimal.fromJSON({ m: 'x', e: 1 }).isZero()).toBe(true);
    expect(Decimal.fromJSON({ m: 1, e: Infinity }).isZero()).toBe(true);
  });
});
