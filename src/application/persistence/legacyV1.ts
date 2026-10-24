import { Decimal } from '@shared/lib/decimal';
import { getBulkSkillCost } from '@entities/skill';

/**
 * Frozen content of save v1 (before career phases, T-016). Only the migration reads it: v1 skill and
 * upgrade ids no longer exist, so their purchases are refunded in Capital, the currency v1 used for
 * every purchase. Never edit these numbers; they describe saves already on players' devices.
 */
const V1_SKILL_PRICES: Record<string, { baseCost: number; costGrowth: number }> = {
  'html-css': { baseCost: 15, costGrowth: 1.15 },
  javascript: { baseCost: 80, costGrowth: 1.16 },
  react: { baseCost: 600, costGrowth: 1.17 },
  node: { baseCost: 3_500, costGrowth: 1.18 },
  docker: { baseCost: 25_000, costGrowth: 1.19 },
  'system-design': { baseCost: 250_000, costGrowth: 1.2 },
  coffee: { baseCost: 25, costGrowth: 1.15 },
  daily: { baseCost: 180, costGrowth: 1.16 },
  linkedin: { baseCost: 800, costGrowth: 1.17 },
  delegate: { baseCost: 6_000, costGrowth: 1.18 },
};

const V1_UPGRADE_PRICES: Record<string, number> = {
  'tailwind-macro': 250,
  'v8-turbofan': 1_200,
  'react-compiler': 15_000,
  'libuv-worker': 100_000,
  'k8s-operator': 750_000,
};

/** v1 had 9 ranks; phases added two student ranks before Trainee (docs/economy/phases.md §9). */
const V1_RANK_TO_V2 = [0, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** v1 skills are capped at this level when refunding, so a tampered save can't mint unbounded Capital. */
const MAX_REFUNDED_LEVEL = 10_000;

export function mapV1Rank(rank: unknown): number {
  const safe = typeof rank === 'number' && Number.isFinite(rank) ? Math.floor(rank) : 0;
  return V1_RANK_TO_V2[Math.min(V1_RANK_TO_V2.length - 1, Math.max(0, safe))];
}

/** Capital the player spent on v1 skills and upgrades; unknown ids and bad values count as zero. */
export function getV1Refund(levels: unknown, purchasedUpgrades: unknown): Decimal {
  let refund = Decimal.ZERO;
  if (levels && typeof levels === 'object') {
    for (const [id, raw] of Object.entries(levels as Record<string, unknown>)) {
      const price = V1_SKILL_PRICES[id];
      if (!price || typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) continue;
      const level = Math.min(MAX_REFUNDED_LEVEL, Math.floor(raw));
      refund = refund.add(getBulkSkillCost(Decimal.from(price.baseCost), price.costGrowth, 0, level));
    }
  }
  if (Array.isArray(purchasedUpgrades)) {
    for (const id of new Set(purchasedUpgrades)) {
      const price = typeof id === 'string' ? V1_UPGRADE_PRICES[id] : undefined;
      if (price !== undefined) refund = refund.add(Decimal.from(price));
    }
  }
  return refund;
}
