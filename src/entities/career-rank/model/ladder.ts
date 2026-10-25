import { Decimal } from '@shared/lib/decimal';
import { CAREER_RANKS, clampRank, getUnlockedResources, type RankResource, type RequirementProgress } from './ranks';

/**
 * What the player may know about a rank (T-008, user decision 2026-10-24):
 * passed and current ranks are fully visible, the next one is the visible goal, everything beyond it is
 * hidden. Hidden ranks never leak a title, a count or the existence of a final rank.
 */
export type RankVisibility = 'visible' | 'next' | 'hidden';

export function getRankVisibility(rankId: number, currentRank: number): RankVisibility {
  const current = clampRank(currentRank);
  if (!Number.isFinite(rankId) || rankId < 0) return 'hidden';
  if (rankId <= current) return 'visible';
  if (rankId === current + 1 && CAREER_RANKS[rankId]) return 'next';
  return 'hidden';
}

export type LadderStep =
  | { kind: 'rank'; rankId: number; state: 'past' | 'current' | 'next' }
  /** One anonymous placeholder above the next rank. No id: the UI must not know what hides there. */
  | { kind: 'silhouette' };

/**
 * The career ladder bottom-up: passed ranks, current, next, then a single "???" silhouette.
 * The silhouette appears only while at least one rank beyond the next exists, so the final rank is
 * revealed the moment it becomes the next goal and nothing is hinted after it.
 */
export function getVisibleLadder(currentRank: number): LadderStep[] {
  const current = clampRank(currentRank);
  const steps: LadderStep[] = [];
  for (let id = 0; id <= current; id += 1) {
    steps.push({ kind: 'rank', rankId: id, state: id === current ? 'current' : 'past' });
  }
  if (CAREER_RANKS[current + 1]) steps.push({ kind: 'rank', rankId: current + 1, state: 'next' });
  if (CAREER_RANKS[current + 2]) steps.push({ kind: 'silhouette' });
  return steps;
}

/** Progress of one requirement as a 0..1 ratio. Divides Decimals, so it stays finite past 1e308. */
export function getRequirementRatio({ current, target, met }: RequirementProgress): number {
  if (met || !target.isPositive()) return 1;
  if (!current.isPositive()) return 0;
  const ratio = current.divide(target).toNumber();
  if (!Number.isFinite(ratio)) return 0;
  return Math.min(1, Math.max(0, ratio));
}

/** How much is still missing (target − current, never negative). */
export function getRequirementShortfall({ current, target, met }: RequirementProgress): Decimal {
  if (met) return Decimal.ZERO;
  const missing = target.subtract(current);
  return missing.isPositive() ? missing : Decimal.ZERO;
}

/** The first unmet requirement: the reason the promote button is disabled. Null when all are met. */
export function getFirstUnmetRequirement(progress: RequirementProgress[]): RequirementProgress | null {
  return progress.find((item) => !item.met) ?? null;
}

/** Resources the player gains access to by moving from `fromRank` to `toRank` (celebration card). */
export function getNewlyUnlockedResources(fromRank: number, toRank: number): RankResource[] {
  const before = new Set(getUnlockedResources(fromRank));
  return getUnlockedResources(toRank).filter((resource) => !before.has(resource));
}
