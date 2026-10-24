import { Decimal } from '@shared/lib/decimal';
import { getBulkSkillCost, getSkillCost, getTapStressMultiplier } from '../skillEffects';

describe('costs beyond the JS number range', () => {
  it('keeps growing past 1e308', () => {
    const a = getSkillCost(Decimal.from(15), 1.15, 6_000);
    const b = getSkillCost(Decimal.from(15), 1.15, 7_000);
    expect(a.exponent).toBeGreaterThan(308);
    expect(b.gt(a)).toBe(true);
  });

  it('prices huge bulk purchases above the single last level', () => {
    const bulk = getBulkSkillCost(Decimal.from(15), 1.15, 5_000, 1_000);
    expect(bulk.gt(getSkillCost(Decimal.from(15), 1.15, 5_999))).toBe(true);
  });

  it('reduces tap stress with diminishing returns', () => {
    expect(getTapStressMultiplier(0)).toBe(1);
    expect(getTapStressMultiplier(100)).toBe(0.5);
    expect(getTapStressMultiplier(-5)).toBe(1);
  });
});
