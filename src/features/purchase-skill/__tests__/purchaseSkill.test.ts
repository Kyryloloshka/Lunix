import { Decimal } from '@shared/lib/decimal';
import { SKILLS } from '@entities/skill';
import { canPurchaseSkill, getNextSkillCost } from '../model/purchaseSkill';

describe('purchase skill', () => {
  const skill = SKILLS[0];

  test('cost grows from the base cost', () => {
    expect(getNextSkillCost(skill, 0).eq(skill.baseCost)).toBe(true);
    expect(getNextSkillCost(skill, 1).gt(skill.baseCost)).toBe(true);
  });

  test('checks affordability against the base cost', () => {
    expect(canPurchaseSkill(skill.baseCost, skill, 0)).toBe(true);
    expect(canPurchaseSkill(skill.baseCost.subtract(Decimal.from(1)), skill, 0)).toBe(false);
  });
});
