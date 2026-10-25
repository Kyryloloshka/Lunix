import { Decimal } from '@shared/lib/decimal';
import { MAX_RANK, type RequirementProgress } from '../ranks';
import {
  getFirstUnmetRequirement,
  getNewlyUnlockedResources,
  getRankVisibility,
  getRequirementRatio,
  getRequirementShortfall,
  getVisibleLadder,
} from '../ladder';

const influence = (current: Decimal, target: Decimal): RequirementProgress => ({
  requirement: { type: 'spend', resource: 'influence', amount: target },
  current,
  target,
  met: current.gte(target),
});

describe('career ladder visibility', () => {
  it('shows past, current, next and one silhouette, bottom-up', () => {
    expect(getVisibleLadder(2)).toEqual([
      { kind: 'rank', rankId: 0, state: 'past' },
      { kind: 'rank', rankId: 1, state: 'past' },
      { kind: 'rank', rankId: 2, state: 'current' },
      { kind: 'rank', rankId: 3, state: 'next' },
      { kind: 'silhouette' },
    ]);
  });

  it('starts with current, next and a silhouette on a fresh game', () => {
    expect(getVisibleLadder(0)).toEqual([
      { kind: 'rank', rankId: 0, state: 'current' },
      { kind: 'rank', rankId: 1, state: 'next' },
      { kind: 'silhouette' },
    ]);
  });

  it('never exposes more than one rank beyond the current one', () => {
    for (let rank = 0; rank <= MAX_RANK; rank += 1) {
      const ladder = getVisibleLadder(rank);
      const shown = ladder.flatMap((step) => (step.kind === 'rank' ? [step.rankId] : []));
      expect(Math.max(...shown)).toBeLessThanOrEqual(rank + 1);
      expect(ladder.filter((step) => step.kind === 'silhouette').length).toBeLessThanOrEqual(1);
    }
  });

  it('hides the final rank until it is next, then drops the silhouette', () => {
    expect(getRankVisibility(MAX_RANK, MAX_RANK - 2)).toBe('hidden');
    expect(getVisibleLadder(MAX_RANK - 2).at(-1)).toEqual({ kind: 'silhouette' });

    expect(getRankVisibility(MAX_RANK, MAX_RANK - 1)).toBe('next');
    const ladder = getVisibleLadder(MAX_RANK - 1);
    expect(ladder.at(-1)).toEqual({ kind: 'rank', rankId: MAX_RANK, state: 'next' });
    expect(ladder.some((step) => step.kind === 'silhouette')).toBe(false);
  });

  it('shows no next rank and no silhouette at the top', () => {
    const ladder = getVisibleLadder(MAX_RANK);
    expect(ladder.at(-1)).toEqual({ kind: 'rank', rankId: MAX_RANK, state: 'current' });
    expect(ladder).toHaveLength(MAX_RANK + 1);
  });

  it('classifies visibility and clamps invalid ranks', () => {
    expect(getRankVisibility(1, 3)).toBe('visible');
    expect(getRankVisibility(3, 3)).toBe('visible');
    expect(getRankVisibility(4, 3)).toBe('next');
    expect(getRankVisibility(5, 3)).toBe('hidden');
    expect(getRankVisibility(-1, 3)).toBe('hidden');
    expect(getRankVisibility(1, Number.NaN)).toBe('next');
    expect(getVisibleLadder(-5)[0]).toEqual({ kind: 'rank', rankId: 0, state: 'current' });
    expect(getVisibleLadder(999).at(-1)).toEqual({ kind: 'rank', rankId: MAX_RANK, state: 'current' });
  });
});

describe('requirement progress', () => {
  it('computes Influence ratio and shortfall', () => {
    const item = influence(Decimal.from(2), Decimal.from(5));
    expect(getRequirementRatio(item)).toBeCloseTo(0.4);
    expect(getRequirementShortfall(item).toNumber()).toBe(3);
  });

  it('handles zero and met requirements', () => {
    expect(getRequirementRatio(influence(Decimal.ZERO, Decimal.from(5)))).toBe(0);
    expect(getRequirementRatio(influence(Decimal.from(9), Decimal.from(5)))).toBe(1);
    expect(getRequirementShortfall(influence(Decimal.from(9), Decimal.from(5))).isZero()).toBe(true);
    expect(getRequirementRatio(influence(Decimal.ZERO, Decimal.ZERO))).toBe(1);
  });

  it('treats negative balances as no progress', () => {
    const item = influence(Decimal.from(-3), Decimal.from(5));
    expect(getRequirementRatio(item)).toBe(0);
    expect(getRequirementShortfall(item).toNumber()).toBe(8);
  });

  it('stays finite beyond 1e308', () => {
    const half = influence(new Decimal(5, 400), new Decimal(1, 401));
    expect(getRequirementRatio(half)).toBeCloseTo(0.5);
    expect(getRequirementShortfall(half).compareTo(new Decimal(5, 400))).toBe(0);

    const tiny = influence(Decimal.from(1), new Decimal(1, 500));
    expect(getRequirementRatio(tiny)).toBe(0);
  });

  it('names the first unmet requirement as the blocker', () => {
    const met = influence(Decimal.from(5), Decimal.from(5));
    const unmet = influence(Decimal.from(1), Decimal.from(5));
    expect(getFirstUnmetRequirement([met, unmet])).toBe(unmet);
    expect(getFirstUnmetRequirement([met])).toBeNull();
  });
});

describe('newly unlocked resources', () => {
  it('reports a resource only on the rank that unlocks it', () => {
    expect(getNewlyUnlockedResources(2, 3)).toEqual(['capital']);
    expect(getNewlyUnlockedResources(4, 5)).toEqual(['influence']);
    expect(getNewlyUnlockedResources(0, 1)).toEqual([]);
  });
});
