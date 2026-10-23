import { Decimal } from '../../decimal';
import {
  formatCognitive,
  formatCurrency,
  formatDecimal,
  formatInfluence,
} from '../formatDecimal';

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

  test('formatCognitive appends brain emoji', () => {
    expect(formatCognitive(Decimal.from(50000))).toBe('50.00K 🧠');
  });

  test('formatInfluence appends lightning emoji', () => {
    expect(formatInfluence(Decimal.from(1000000))).toBe('1.00M ⚡');
  });
});
