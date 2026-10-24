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

export function getSkillCost(baseCost: Decimal, growth: number, level: number): Decimal {
  const safeLevel = Math.max(0, Math.floor(level));
  const safeGrowth = Math.max(growth, 1);
  // Log space keeps costs growing past 1e308 instead of overflowing to Infinity.
  return baseCost.multiply(Decimal.fromLog10(safeLevel * Math.log10(safeGrowth)));
}

export function getBulkSkillCost(
  baseCost: Decimal,
  growth: number,
  level: number,
  count: number,
): Decimal {
  const safeCount = Math.max(0, Math.floor(count));
  if (safeCount === 0) return Decimal.ZERO;
  const safeGrowth = Math.max(growth, 1);
  const firstCost = getSkillCost(baseCost, safeGrowth, level);
  if (safeGrowth - 1 < Number.EPSILON) return firstCost.multiplyScalar(safeCount);

  // Geometric series: firstCost * (growth^count - 1) / (growth - 1).
  const growthPow = Decimal.fromLog10(safeCount * Math.log10(safeGrowth));
  if (growthPow.exponent < 12) {
    // Remove floating-point noise from small geometric sums (e.g. 1 + 2 + 4 = 7).
    const sum = (growthPow.toNumber() - 1) / (safeGrowth - 1);
    return firstCost.multiplyScalar(Math.round(sum * 1e12) / 1e12);
  }
  return firstCost.multiply(growthPow.subtract(1)).divide(safeGrowth - 1);
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

/** Each point of stress reduction makes taps ~1% less stressful, with diminishing returns. */
export function getTapStressMultiplier(stressReduction: number): number {
  const safeReduction = Number.isFinite(stressReduction) ? Math.max(0, stressReduction) : 0;
  return 1 / (1 + safeReduction / 100);
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
