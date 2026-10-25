import { Decimal } from '@shared/lib/decimal';
import { CAREER_RANKS, MAX_RANK } from '@entities/career-rank';
import { INITIAL_SKILL_LEVELS, SKILLS, UPGRADES, skillById } from '@entities/skill';
import {
  canPromoteNow,
  hasAffordablePurchase,
  selectNextGoal,
  type NextGoalState,
} from '../model/nextGoal';
import { MAX_WAIT_SECONDS, getWaitHint, getWaitIncome } from '../model/waitHint';
import { useCurrencyStore } from '@entities/currency';

const D = (value: number) => Decimal.from(value);

function state(overrides: Partial<NextGoalState> = {}): NextGoalState {
  return {
    rank: 0,
    levels: { ...INITIAL_SKILL_LEVELS },
    purchasedUpgrades: [],
    balances: { cognitive: D(0), capital: D(0), influence: D(0) },
    earned: { cognitive: D(0), capital: D(0) },
    ...overrides,
  };
}

describe('selectNextGoal', () => {
  it('fresh save: buy the first skill the next rank asks for, with progress in Cognitive', () => {
    const goal = selectNextGoal(state({ balances: { cognitive: D(5), capital: D(0), influence: D(0) } }));
    expect(goal).toMatchObject({ kind: 'buySkill', skillId: 'html-tags', level: 1, tab: 'skills', resource: 'cognitive', ready: false });
    expect(goal?.target.eq(skillById('html-tags')!.baseCost)).toBe(true);
    expect(goal?.ratio).toBeCloseTo(0.5, 5);
  });

  it('is ready when the skill is affordable', () => {
    const goal = selectNextGoal(state({ balances: { cognitive: D(10), capital: D(0), influence: D(0) } }));
    expect(goal).toMatchObject({ kind: 'buySkill', ready: true, ratio: 1 });
  });

  it('walks a skill requirement down to the first prerequisite that can be bought', () => {
    // Rank 1 -> 2 needs js-basics 3, which needs css-centering 3, which needs html-tags 3.
    const goal = selectNextGoal(state({ rank: 1, levels: { ...INITIAL_SKILL_LEVELS, 'html-tags': 5 } }));
    expect(goal).toMatchObject({ kind: 'buySkill', skillId: 'css-centering', level: 1 });
    const later = selectNextGoal(state({ rank: 1, levels: { ...INITIAL_SKILL_LEVELS, 'html-tags': 5, 'css-centering': 3 } }));
    expect(later).toMatchObject({ kind: 'buySkill', skillId: 'js-basics', level: 1 });
  });

  it('asks for lifetime earnings once the skill requirements are met', () => {
    const goal = selectNextGoal(state({
      levels: { ...INITIAL_SKILL_LEVELS, 'html-tags': 5 },
      earned: { cognitive: D(100), capital: D(0) },
    }));
    expect(goal).toMatchObject({ kind: 'earn', rankId: 1, tab: 'work', resource: 'cognitive' });
    expect(goal?.ratio).toBeCloseTo(0.4, 5);
  });

  it('points at the promotion when every requirement is met', () => {
    const goal = selectNextGoal(state({
      levels: { ...INITIAL_SKILL_LEVELS, 'html-tags': 5 },
      earned: { cognitive: D(250), capital: D(0) },
    }));
    expect(goal).toMatchObject({ kind: 'promote', rankId: 1, tab: 'career', ready: true, ratio: 1 });
  });

  it('only ever names the next rank, never one beyond it', () => {
    for (let rank = 0; rank < MAX_RANK; rank += 1) {
      const goal = selectNextGoal(state({ rank }));
      if (goal && 'rankId' in goal) expect(goal.rankId).toBe(rank + 1);
    }
  });

  it('asks for Influence to spend on the leadership ranks', () => {
    const levels = { ...INITIAL_SKILL_LEVELS };
    const goal = selectNextGoal(state({
      rank: 5,
      levels,
      earned: { cognitive: D(1e12), capital: D(2e7) },
      balances: { cognitive: D(0), capital: D(0), influence: D(7_500) },
    }));
    expect(goal).toMatchObject({ kind: 'spend', rankId: 6, resource: 'influence' });
    expect(goal?.ratio).toBeCloseTo(0.5, 5);
  });

  it('top rank: aims at the purchase closest to affordable', () => {
    const levels = Object.fromEntries(SKILLS.map((skill) => [skill.id, 12]));
    const goal = selectNextGoal(state({
      rank: MAX_RANK,
      levels,
      purchasedUpgrades: UPGRADES.map((upgrade) => upgrade.id),
      balances: { cognitive: D(1e30), capital: D(1e30), influence: D(1e30) },
    }));
    expect(goal?.kind).toBe('buySkill');
    expect(goal?.ready).toBe(true);
  });

  it('everything bought: nothing to aim at', () => {
    const levels = Object.fromEntries(SKILLS.map((skill) => [skill.id, 99]));
    const goal = selectNextGoal(
      state({ rank: MAX_RANK, levels, purchasedUpgrades: UPGRADES.map((upgrade) => upgrade.id) }),
      { skills: SKILLS.filter((skill) => skill.maxLevel !== undefined), upgrades: UPGRADES },
    );
    expect(goal).toBeNull();
  });

  it('clamps an out-of-range rank instead of crashing', () => {
    expect(() => selectNextGoal(state({ rank: 999 }))).not.toThrow();
    expect(selectNextGoal(state({ rank: -3 }))?.kind).toBe('buySkill');
    expect(() => selectNextGoal(state({ rank: Number.NaN }))).not.toThrow();
  });

  it('keeps ratios finite for Decimals beyond 1e308', () => {
    const huge = new Decimal(1, 400);
    const goal = selectNextGoal(state({
      rank: MAX_RANK,
      levels: Object.fromEntries(SKILLS.map((skill) => [skill.id, 3])),
      balances: { cognitive: huge, capital: huge.multiplyScalar(0.001), influence: D(0) },
    }));
    expect(goal).not.toBeNull();
    expect(Number.isFinite(goal!.ratio)).toBe(true);
    expect(goal!.ratio).toBeGreaterThanOrEqual(0);
    expect(goal!.ratio).toBeLessThanOrEqual(1);

    const earn = selectNextGoal(state({
      rank: 6,
      earned: { cognitive: huge, capital: new Decimal(1, 350) },
    }));
    expect(earn).toMatchObject({ kind: 'spend' });
    expect(Number.isFinite(earn!.ratio)).toBe(true);
  });

  it('every rank requirement of the registry resolves to a reachable goal for a fresh player at that rank', () => {
    for (const rank of CAREER_RANKS.slice(0, -1)) {
      const goal = selectNextGoal(state({ rank: rank.id }));
      expect(goal).not.toBeNull();
    }
  });
});

describe('dock badges', () => {
  it('Stack: only when something visible is affordable', () => {
    expect(hasAffordablePurchase(state())).toBe(false);
    expect(hasAffordablePurchase(state({ balances: { cognitive: D(10), capital: D(0), influence: D(0) } }))).toBe(true);
  });

  it('Stack: ignores skills locked by prerequisites or rank', () => {
    // Plenty of Capital, but at rank 0 only Cognitive skills exist.
    expect(hasAffordablePurchase(state({ balances: { cognitive: D(0), capital: D(1e9), influence: D(0) } }))).toBe(false);
  });

  it('Career: only when every requirement of the next rank is met', () => {
    expect(canPromoteNow(state())).toBe(false);
    expect(canPromoteNow(state({
      levels: { ...INITIAL_SKILL_LEVELS, 'html-tags': 5 },
      earned: { cognitive: D(250), capital: D(0) },
    }))).toBe(true);
    expect(canPromoteNow(state({ rank: MAX_RANK }))).toBe(false);
  });
});

describe('getWaitHint', () => {
  it('ready when affordable', () => {
    expect(getWaitHint(D(10), D(10), D(0))).toEqual({ kind: 'ready' });
  });

  it('seconds, rounded up, when income is positive', () => {
    expect(getWaitHint(D(15), D(13), D(0.5))).toEqual({ kind: 'seconds', seconds: 4 });
    expect(getWaitHint(D(15), D(14.999), D(100))).toEqual({ kind: 'seconds', seconds: 1 });
  });

  it('falls back to the missing amount without income or when the wait is too long', () => {
    const noIncome = getWaitHint(D(15), D(13), D(0));
    expect(noIncome.kind).toBe('more');
    if (noIncome.kind === 'more') expect(noIncome.amount.toNumber()).toBeCloseTo(2, 9);
    expect(getWaitHint(D(1e6), D(0), D(1)).kind).toBe('more');
    const edge = getWaitHint(D(MAX_WAIT_SECONDS), D(0), D(1));
    expect(edge).toEqual({ kind: 'seconds', seconds: MAX_WAIT_SECONDS });
  });

  it('works past 1e308 without NaN', () => {
    const cost = new Decimal(1, 400);
    const hint = getWaitHint(cost, new Decimal(1, 399), new Decimal(1, 398));
    expect(hint).toEqual({ kind: 'seconds', seconds: 90 });
    expect(getWaitHint(cost, D(0), D(1)).kind).toBe('more');
  });
});

describe('getWaitIncome', () => {
  it('uses real income when it beats the passive rate, otherwise the passive rate', () => {
    const rates = { ...useCurrencyStore.getState().rates, cognitivePerSec: D(2) };
    const zero = { capital: D(0), cognitive: D(0), influence: D(0) };
    expect(getWaitIncome('cognitive', zero, rates).eq(D(2))).toBe(true);
    expect(getWaitIncome('cognitive', { ...zero, cognitive: D(0.04) }, rates).eq(D(2))).toBe(true);
    expect(getWaitIncome('cognitive', { ...zero, cognitive: D(7) }, rates).eq(D(7))).toBe(true);
    expect(getWaitIncome('capital', zero, rates).isZero()).toBe(true);
  });
});
