import { Decimal } from '@shared/lib/decimal';
import { SKILLS } from './skillRegistry';
import { TECH_UPGRADES } from './upgradesRegistry';

export interface SkillEffects {
  capitalPerSec: Decimal;
  cognitivePerSec: Decimal;
  influencePerSec: Decimal;
  capitalPerClick: Decimal;
  stressReduction: number;
}

export const INITIAL_SKILL_LEVELS: Record<string, number> = Object.fromEntries(
  SKILLS.map((skill) => [skill.id, 0]),
);

export type PurchaseMode = 1 | 10 | 100 | 'max';

export interface BulkPurchase {
  levels: number;
  totalCost: Decimal;
  nextCost: Decimal;
}

function geometricSum(growth: number, count: number): number {
  if (count <= 0) return 0;
  if (Math.abs(growth - 1) < Number.EPSILON) return count;
  const logValue = count * Math.log(growth);
  if (logValue > 709) return Infinity;
  return (Math.exp(logValue) - 1) / (growth - 1);
}

export function getSkillCost(baseCost: Decimal, growth: number, level: number): Decimal {
  const safeLevel = Math.max(0, Math.floor(level));
  const exponent = safeLevel * Math.log10(Math.max(growth, 1));
  if (exponent > 308) return new Decimal(1, 309);
  return baseCost.multiplyScalar(Math.pow(Math.max(growth, 1), safeLevel));
}

export function getBulkSkillCost(
  baseCost: Decimal,
  growth: number,
  level: number,
  count: number,
): Decimal {
  const safeCount = Math.max(0, Math.floor(count));
  if (safeCount === 0) return Decimal.ZERO;
  const firstCost = getSkillCost(baseCost, growth, level);
  const sum = geometricSum(Math.max(growth, 1), safeCount);
  if (!Number.isFinite(sum)) return new Decimal(1, 309);
  return firstCost.multiplyScalar(sum);
}

export function isSkillTreeReachable(levels: Record<string, number>, currentRank: number): boolean {
  return SKILLS.every((skill) => {
    if (skill.unlockRank > currentRank) return true;
    return skill.prerequisites?.every((requirement) => SKILLS.some((candidate) => candidate.id === requirement.skillId)) ?? true;
  });
}

export function getMaxAffordableLevel(
  baseCost: Decimal,
  growth: number,
  level: number,
  budget: Decimal,
): number {
  if (budget.lt(getSkillCost(baseCost, growth, level))) return 0;
  let low = 1;
  let high = 1;
  while (high < 1_000_000 && getBulkSkillCost(baseCost, growth, level, high).lte(budget)) {
    low = high;
    high *= 2;
  }
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (getBulkSkillCost(baseCost, growth, level, middle).lte(budget)) low = middle;
    else high = middle;
  }
  return low;
}

export function calculateBulkPurchase(
  baseCost: Decimal,
  growth: number,
  level: number,
  budget: Decimal,
  mode: PurchaseMode,
): BulkPurchase {
  const levels = mode === 'max'
    ? getMaxAffordableLevel(baseCost, growth, level, budget)
    : Math.max(0, mode);
  const totalCost = getBulkSkillCost(baseCost, growth, level, levels);
  return { levels, totalCost, nextCost: getSkillCost(baseCost, growth, level + levels) };
}

export function calculateSkillEffects(
  levels: Record<string, number>,
  purchasedUpgrades: string[] = [],
): SkillEffects {
  const multipliers = purchasedUpgrades.reduce<Record<string, number>>((acc, id) => {
    const upgrade = TECH_UPGRADES.find((item) => item.id === id);
    if (upgrade) {
      acc[upgrade.targetSkillId] = (acc[upgrade.targetSkillId] ?? 1) * upgrade.multiplier;
    }
    return acc;
  }, {});

  return SKILLS.reduce<SkillEffects>((effects, skill) => {
    const level = levels[skill.id] ?? 0;
    if (level <= 0) return effects;

    const mult = multipliers[skill.id] ?? 1;

    return {
      capitalPerSec: effects.capitalPerSec.add(skill.capitalPerLevel.multiplyScalar(level * mult)),
      cognitivePerSec: effects.cognitivePerSec.add(skill.cognitivePerLevel.multiplyScalar(level * mult)),
      influencePerSec: effects.influencePerSec.add(skill.influencePerLevel.multiplyScalar(level * mult)),
      capitalPerClick: effects.capitalPerClick.add(skill.clickCapitalPerLevel.multiplyScalar(level * mult)),
      stressReduction: effects.stressReduction + skill.stressReductionPerLevel * level,
    };
  }, {
    capitalPerSec: Decimal.ZERO,
    cognitivePerSec: Decimal.ZERO,
    influencePerSec: Decimal.ZERO,
    capitalPerClick: Decimal.from(1),
    stressReduction: 0,
  });
}
