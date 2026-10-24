import { Decimal } from '@shared/lib/decimal';
import { getSkillCost } from '@entities/skill';
import type { SkillDefinition } from '@entities/skill';

export function getNextSkillCost(skill: SkillDefinition, level: number): Decimal {
  return getSkillCost(skill.baseCost, skill.costGrowth, level);
}

/** `balance` is the player's amount of the skill's cost resource. */
export function canPurchaseSkill(
  balance: Decimal,
  skill: SkillDefinition,
  level: number,
): boolean {
  return balance.gte(getNextSkillCost(skill, level));
}
