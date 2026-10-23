import { Decimal } from '@shared/lib/decimal';
import {
  calculateBulkPurchase,
  getBulkSkillCost,
  getMaxAffordableLevel,
} from '../skillEffects';

describe('skill bulk pricing', () => {
  const base = Decimal.from(10);

  it('uses the geometric sum for bulk purchases', () => {
    expect(getBulkSkillCost(base, 2, 0, 3).eq(70)).toBe(true);
  });

  it('finds the maximum affordable quantity without linear growth', () => {
    expect(getMaxAffordableLevel(base, 2, 0, Decimal.from(70))).toBe(3);
    expect(calculateBulkPurchase(base, 2, 0, Decimal.from(69), 'max').levels).toBe(2);
  });
});
