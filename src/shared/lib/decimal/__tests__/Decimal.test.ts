import { Decimal } from '../Decimal';

describe('Decimal', () => {
  test('normalizes values into mantissa and exponent', () => {
    const value = Decimal.from(1500);
    expect(value.mantissa).toBeCloseTo(1.5);
    expect(value.exponent).toBe(3);
  });

  test('supports arithmetic at exponents beyond Number range', () => {
    const huge = new Decimal(1.25, 100);
    const doubled = huge.multiplyScalar(2);
    expect(doubled.mantissa).toBeCloseTo(2.5);
    expect(doubled.exponent).toBe(100);
    expect(huge.add(huge).eq(doubled)).toBe(true);
  });

  test('adds and subtracts nearby values', () => {
    expect(Decimal.from(10).add(Decimal.from(3)).toNumber()).toBeCloseTo(13);
    expect(Decimal.from(10).subtract(Decimal.from(3)).toNumber()).toBeCloseTo(7);
  });

  test('subtracting from zero preserves a negative value', () => {
    expect(Decimal.ZERO.subtract(Decimal.from(5)).toNumber()).toBeCloseTo(-5);
  });

  test('multiplies, divides, and raises to a power', () => {
    expect(Decimal.from(2).multiply(Decimal.from(3)).toNumber()).toBeCloseTo(6);
    expect(Decimal.from(1e12).divide(Decimal.from(1e6)).toNumber()).toBeCloseTo(1e6);
    expect(Decimal.from(2).pow(10).toNumber()).toBeCloseTo(1024);
  });

  test('compares values beyond Number range', () => {
    expect(new Decimal(1, 100).gt(new Decimal(9, 99))).toBe(true);
    expect(new Decimal(1, 100).eq(new Decimal(10, 99))).toBe(true);
  });

  test('serializes and restores normalized values', () => {
    const value = new Decimal(1.234, 100);
    expect(Decimal.fromJSON(JSON.parse(JSON.stringify(value))).eq(value)).toBe(true);
  });

  test('normalizes non-finite input to zero', () => {
    expect(Decimal.from(Infinity).isZero()).toBe(true);
    expect(Decimal.from(NaN).isZero()).toBe(true);
  });
});
