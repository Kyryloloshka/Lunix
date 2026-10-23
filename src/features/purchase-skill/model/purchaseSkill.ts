import { Decimal } from '@shared/lib/decimal';
import { getSkillCost } from '@entities/skill';
import type { SkillDefinition } from '@entities/skill';

export function getNextSkillCost(skill: SkillDefinition, level: number): Decimal {
  return getSkillCost(skill.baseCost, skill.costGrowth, level);
}

export function canPurchaseSkill(
  capital: Decimal,
  skill: SkillDefinition,
  level: number,
): boolean {
  return capital.gte(getNextSkillCost(skill, level));
}
