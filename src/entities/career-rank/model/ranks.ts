import { Decimal } from '@shared/lib/decimal';

/** Resources a rank can gate on. Kept as names here so this entity does not import other entities. */
export type RankResource = 'cognitive' | 'capital' | 'influence';

export type RankRequirement =
  /** Lifetime total earned; spending never takes the player back. */
  | { type: 'earned'; resource: 'cognitive' | 'capital'; amount: Decimal }
  | { type: 'skillLevel'; skillId: string; level: number }
  /** Consumed on promotion. */
  | { type: 'spend'; resource: 'influence'; amount: Decimal };

export type CareerPhase = 1 | 2 | 3;

export interface CareerRank {
  id: number;
  phase: CareerPhase;
  /** Requirements to be promoted onto this rank. Rank 0 is the start and has none. */
  requirements: RankRequirement[];
}

const D = (value: number) => Decimal.from(value);
const earned = (resource: 'cognitive' | 'capital', amount: number): RankRequirement => ({ type: 'earned', resource, amount: D(amount) });
const skill = (skillId: string, level: number): RankRequirement => ({ type: 'skillLevel', skillId, level });
const spend = (amount: number): RankRequirement => ({ type: 'spend', resource: 'influence', amount: D(amount) });

/** docs/economy/phases.md §3 (approved 2026-10-24). Titles live in i18n under career.ranks.<id>. */
export const CAREER_RANKS: CareerRank[] = [
  { id: 0, phase: 1, requirements: [] },
  { id: 1, phase: 1, requirements: [earned('cognitive', 250), skill('html-tags', 5)] },
  { id: 2, phase: 1, requirements: [earned('cognitive', 1_500), skill('js-basics', 3)] },
  { id: 3, phase: 2, requirements: [earned('cognitive', 6_000), skill('git', 1)] },
  { id: 4, phase: 2, requirements: [earned('capital', 60_000), skill('cafe-landing', 10)] },
  { id: 5, phase: 3, requirements: [earned('capital', 3e5), skill('algorithms', 5)] },
  { id: 6, phase: 3, requirements: [earned('capital', 2e7), spend(15_000)] },
  { id: 7, phase: 3, requirements: [earned('capital', 1.5e8), spend(50_000)] },
  { id: 8, phase: 3, requirements: [earned('capital', 8e9), spend(1e6)] },
  { id: 9, phase: 3, requirements: [earned('capital', 4e11), spend(2e7)] },
  { id: 10, phase: 3, requirements: [earned('capital', 1.5e13), spend(2e8)] },
];

export const MAX_RANK = CAREER_RANKS.length - 1;

/** First rank on which each resource exists for the player (HUD, tap mode, catalog). */
export const RESOURCE_UNLOCK_RANK: Record<RankResource, number> = {
  cognitive: 0,
  capital: 3,
  influence: 5,
};

export function clampRank(rank: number): number {
  const safe = Number.isFinite(rank) ? Math.floor(rank) : 0;
  return Math.min(MAX_RANK, Math.max(0, safe));
}

export function getCareerPhase(rank: number): CareerPhase {
  return CAREER_RANKS[clampRank(rank)].phase;
}

export function isResourceUnlocked(resource: RankResource, rank: number): boolean {
  return clampRank(rank) >= RESOURCE_UNLOCK_RANK[resource];
}

export function getUnlockedResources(rank: number): RankResource[] {
  return (Object.keys(RESOURCE_UNLOCK_RANK) as RankResource[])
    .filter((resource) => isResourceUnlocked(resource, rank))
    .sort((a, b) => RESOURCE_UNLOCK_RANK[a] - RESOURCE_UNLOCK_RANK[b]);
}

export interface RankProgressContext {
  earned: Record<'cognitive' | 'capital', Decimal>;
  balance: Record<RankResource, Decimal>;
  levels: Record<string, number>;
}

export interface RequirementProgress {
  requirement: RankRequirement;
  current: Decimal;
  target: Decimal;
  met: boolean;
}

export function getRequirementProgress(requirement: RankRequirement, context: RankProgressContext): RequirementProgress {
  switch (requirement.type) {
    case 'earned': {
      const current = context.earned[requirement.resource];
      return { requirement, current, target: requirement.amount, met: current.gte(requirement.amount) };
    }
    case 'spend': {
      const current = context.balance[requirement.resource];
      return { requirement, current, target: requirement.amount, met: current.gte(requirement.amount) };
    }
    case 'skillLevel': {
      const level = context.levels[requirement.skillId] ?? 0;
      return { requirement, current: Decimal.from(level), target: Decimal.from(requirement.level), met: level >= requirement.level };
    }
  }
}

export function getRankProgress(rankId: number, context: RankProgressContext): RequirementProgress[] {
  const rank = CAREER_RANKS[rankId];
  return rank ? rank.requirements.map((requirement) => getRequirementProgress(requirement, context)) : [];
}

export function areRankRequirementsMet(rankId: number, context: RankProgressContext): boolean {
  if (!CAREER_RANKS[rankId]) return false;
  return getRankProgress(rankId, context).every((progress) => progress.met);
}
