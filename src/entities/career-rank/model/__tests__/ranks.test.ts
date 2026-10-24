import { Decimal } from '@shared/lib/decimal';
import {
  CAREER_RANKS,
  MAX_RANK,
  areRankRequirementsMet,
  clampRank,
  getCareerPhase,
  getRankProgress,
  getUnlockedResources,
  isResourceUnlocked,
  type RankProgressContext,
} from '../ranks';

const context = (overrides: Partial<RankProgressContext> = {}): RankProgressContext => ({
  earned: { cognitive: Decimal.ZERO, capital: Decimal.ZERO },
  balance: { cognitive: Decimal.ZERO, capital: Decimal.ZERO, influence: Decimal.ZERO },
  levels: {},
  ...overrides,
});

describe('career ranks and phases', () => {
  it('has 11 ranks across three phases', () => {
    expect(CAREER_RANKS).toHaveLength(11);
    expect(getCareerPhase(0)).toBe(1);
    expect(getCareerPhase(3)).toBe(2);
    expect(getCareerPhase(5)).toBe(3);
    expect(getCareerPhase(MAX_RANK)).toBe(3);
  });

  it('unlocks Capital with the first job and Influence on Middle', () => {
    expect(getUnlockedResources(0)).toEqual(['cognitive']);
    expect(isResourceUnlocked('capital', 2)).toBe(false);
    expect(getUnlockedResources(3)).toEqual(['cognitive', 'capital']);
    expect(getUnlockedResources(5)).toEqual(['cognitive', 'capital', 'influence']);
  });

  it('clamps bad rank values', () => {
    expect(clampRank(-3)).toBe(0);
    expect(clampRank(Number.NaN)).toBe(0);
    expect(clampRank(999)).toBe(MAX_RANK);
    expect(clampRank(4.9)).toBe(4);
  });

  it('checks lifetime earnings and skill levels for the first promotion', () => {
    expect(areRankRequirementsMet(1, context())).toBe(false);
    expect(areRankRequirementsMet(1, context({ earned: { cognitive: Decimal.from(250), capital: Decimal.ZERO } }))).toBe(false);
    expect(areRankRequirementsMet(1, context({
      earned: { cognitive: Decimal.from(250), capital: Decimal.ZERO },
      levels: { 'html-tags': 5 },
    }))).toBe(true);
  });

  it('checks the Influence balance for leadership ranks', () => {
    const progress = getRankProgress(6, context({
      earned: { cognitive: Decimal.ZERO, capital: Decimal.from(2e7) },
      balance: { cognitive: Decimal.ZERO, capital: Decimal.ZERO, influence: Decimal.from(14_999) },
    }));
    expect(progress.map((item) => item.met)).toEqual([true, false]);
  });

  it('handles values past 1e308 without NaN', () => {
    const huge = new Decimal(1, 500);
    const progress = getRankProgress(10, context({
      earned: { cognitive: huge, capital: huge },
      balance: { cognitive: huge, capital: huge, influence: huge },
    }));
    expect(progress.every((item) => item.met)).toBe(true);
  });

  it('returns nothing for a rank that does not exist', () => {
    expect(getRankProgress(99, context())).toEqual([]);
    expect(areRankRequirementsMet(99, context())).toBe(false);
  });
});
