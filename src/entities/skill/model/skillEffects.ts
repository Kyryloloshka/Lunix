import { Decimal } from '@shared/lib/decimal';
import { SKILLS } from './skillRegistry';
import { UPGRADES } from './upgradesRegistry';
import type { SkillResource } from './types';

export interface SkillEffects {
  capitalPerSec: Decimal;
  cognitivePerSec: Decimal;
  influencePerSec: Decimal;
  /** Multiplier on the base tap value of each resource (1 = no perks). */
  tapMultiplier: Record<SkillResource, number>;
  stressReduction: number;
}

export const INITIAL_SKILL_LEVELS: Record<string, number> = Object.fromEntries(
  SKILLS.map((skill) => [skill.id, 0]),
);

/** Each of these levels doubles a producer's output (PRD §5). */
export const MILESTONE_LEVELS = [25, 50, 100, 200] as const;

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

export function getMilestoneMultiplier(level: number): number {
  return 2 ** MILESTONE_LEVELS.filter((milestone) => level >= milestone).length;
}

/** Derived state: recomputed from levels and purchases after every change, never saved. */
export function calculateSkillEffects(
  levels: Record<string, number>,
  purchasedUpgrades: string[] = [],
): SkillEffects {
  const skillMultipliers: Record<string, number> = {};
  const branchMultipliers: Record<string, number> = {};
  for (const id of purchasedUpgrades) {
    const upgrade = UPGRADES.find((item) => item.id === id);
    if (!upgrade) continue;
    const { effect } = upgrade;
    if (effect.type === 'skillMultiplier') {
      skillMultipliers[effect.skillId] = (skillMultipliers[effect.skillId] ?? 1) * effect.multiplier;
    } else {
      branchMultipliers[effect.branch] = (branchMultipliers[effect.branch] ?? 1) * effect.multiplier;
    }
  }

  const perSec: Record<SkillResource, Decimal> = {
    capital: Decimal.ZERO,
    cognitive: Decimal.ZERO,
    influence: Decimal.ZERO,
  };
  const tapMultiplier: Record<SkillResource, number> = { capital: 1, cognitive: 1, influence: 1 };
  let stressReduction = 0;

  for (const skill of SKILLS) {
    const level = levels[skill.id] ?? 0;
    if (level <= 0) continue;

    if (skill.kind === 'producer') {
      const multiplier = getMilestoneMultiplier(level)
        * (skillMultipliers[skill.id] ?? 1)
        * (branchMultipliers[skill.branch] ?? 1);
      perSec[skill.produces] = perSec[skill.produces].add(skill.perLevel.multiplyScalar(level * multiplier));
    } else if (skill.effect.type === 'tapPower') {
      for (const resource of skill.effect.resources) {
        tapMultiplier[resource] += skill.effect.perLevel * level;
      }
    } else {
      stressReduction += skill.effect.perLevel * level;
    }
  }

  return {
    capitalPerSec: perSec.capital,
    cognitivePerSec: perSec.cognitive,
    influencePerSec: perSec.influence,
    tapMultiplier,
    stressReduction,
  };
}
