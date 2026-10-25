import { Decimal } from '@shared/lib/decimal';
import { useCurrencyStore } from '@entities/currency';
import { useSkillStore } from '../model/skillStore';

const add = (resources: { capital?: number; cognitive?: number; influence?: number }) => {
  useCurrencyStore.getState().addResources({
    capital: resources.capital === undefined ? undefined : Decimal.from(resources.capital),
    cognitive: resources.cognitive === undefined ? undefined : Decimal.from(resources.cognitive),
    influence: resources.influence === undefined ? undefined : Decimal.from(resources.influence),
  });
};

const promoteTo = (rank: number) => {
  while (useSkillStore.getState().currentRank < rank) {
    useSkillStore.setState({ currentRank: useSkillStore.getState().currentRank + 1 });
  }
};

describe('skill store', () => {
  beforeEach(() => {
    useCurrencyStore.getState().reset();
    useSkillStore.getState().reset();
  });

  it('buys a knowledge skill with Cognitive and syncs rates', () => {
    add({ cognitive: 10, capital: 1_000 });
    expect(useSkillStore.getState().buy('html-tags')).toBe(1);
    expect(useCurrencyStore.getState().cognitive.isZero()).toBe(true);
    expect(useCurrencyStore.getState().capital.toNumber()).toBe(1_000);
    expect(useCurrencyStore.getState().rates.cognitivePerSec.toNumber()).toBeCloseTo(0.5);
  });

  it('refuses skills whose rank or prerequisites are not reached', () => {
    add({ capital: 1e9, cognitive: 1e9 });
    expect(useSkillStore.getState().buy('button-color')).toBe(0);
    expect(useSkillStore.getState().buy('css-centering')).toBe(0);
    expect(useCurrencyStore.getState().capital.toNumber()).toBe(1e9);
  });

  it('caps perks at their max level', () => {
    add({ cognitive: 1e12 });
    expect(useSkillStore.getState().buy('aeropress', 'max')).toBe(15);
    expect(useSkillStore.getState().buy('aeropress')).toBe(0);
    expect(useCurrencyStore.getState().rates.cognitivePerClick.toNumber()).toBeCloseTo(1 + 15 * 0.5);
  });

  it('promotes only when earned totals and skill levels are met', () => {
    expect(useSkillStore.getState().promote()).toBe(false);
    add({ cognitive: 1e6 });
    expect(useSkillStore.getState().promote()).toBe(false);
    useSkillStore.setState({ levels: { ...useSkillStore.getState().levels, 'html-tags': 5 } });
    expect(useSkillStore.getState().promote()).toBe(true);
    expect(useSkillStore.getState().currentRank).toBe(1);
    // Earned totals are only checked, never spent.
    expect(useCurrencyStore.getState().cognitive.toNumber()).toBe(1e6);
  });

  it('counts lifetime earnings, so spending does not block a promotion', () => {
    add({ cognitive: 300 });
    useCurrencyStore.getState().spendResources({ cognitive: Decimal.from(300) });
    useSkillStore.setState({ levels: { ...useSkillStore.getState().levels, 'html-tags': 5 } });
    expect(useSkillStore.getState().promote()).toBe(true);
  });

  it('spends Influence on leadership promotions', () => {
    promoteTo(5);
    add({ capital: 2e7, influence: 20_000 });
    expect(useSkillStore.getState().promote()).toBe(true);
    expect(useSkillStore.getState().currentRank).toBe(6);
    expect(useCurrencyStore.getState().influence.toNumber()).toBe(5_000);
  });

  it('taps Cognitive while studying and follows the newest resource on the first job', () => {
    expect(useSkillStore.getState().tap().resource).toBe('cognitive');
    expect(useCurrencyStore.getState().cognitive.isPositive()).toBe(true);
    expect(useCurrencyStore.getState().capital.isZero()).toBe(true);

    promoteTo(2);
    add({ cognitive: 1e6 });
    useSkillStore.setState({ levels: { ...useSkillStore.getState().levels, git: 1 } });
    expect(useSkillStore.getState().promote()).toBe(true);
    expect(useSkillStore.getState().tapResource).toBe('capital');
    expect(useSkillStore.getState().tap().resource).toBe('capital');
  });

  it('emits one unlock event per new resource on promotion, and none for ranks that open nothing', () => {
    promoteTo(1);
    add({ cognitive: 1e6 });
    useSkillStore.setState({ levels: { ...useSkillStore.getState().levels, 'js-basics': 3, git: 1 } });
    expect(useSkillStore.getState().promote()).toBe(true); // rank 2: nothing new
    expect(useSkillStore.getState().pendingResourceUnlocks).toEqual([]);
    expect(useSkillStore.getState().promote()).toBe(true); // rank 3: first salary
    expect(useSkillStore.getState().pendingResourceUnlocks).toEqual(['capital']);

    expect(useSkillStore.getState().acknowledgeResourceUnlock()).toBe('capital');
    expect(useSkillStore.getState().pendingResourceUnlocks).toEqual([]);
    expect(useSkillStore.getState().acknowledgeResourceUnlock()).toBeUndefined();
  });

  it('does not emit unlock events for a failed promotion', () => {
    promoteTo(2);
    expect(useSkillStore.getState().promote()).toBe(false);
    expect(useSkillStore.getState().pendingResourceUnlocks).toEqual([]);
  });

  it('queues Influence after Capital and keeps the order until each card is acknowledged', () => {
    useSkillStore.setState({ pendingResourceUnlocks: ['capital'] });
    promoteTo(4);
    add({ capital: 1e6 });
    useSkillStore.setState({ levels: { ...useSkillStore.getState().levels, algorithms: 5 } });
    expect(useSkillStore.getState().promote()).toBe(true);
    expect(useSkillStore.getState().pendingResourceUnlocks).toEqual(['capital', 'influence']);
    expect(useSkillStore.getState().tapResource).toBe('influence');
    expect(useSkillStore.getState().acknowledgeResourceUnlock()).toBe('capital');
    expect(useSkillStore.getState().acknowledgeResourceUnlock()).toBe('influence');
  });

  it('never replays unlock cards after loading or resetting a save', () => {
    useSkillStore.setState({ pendingResourceUnlocks: ['capital'] });
    useSkillStore.getState().hydrate({ levels: {}, purchasedUpgrades: [], currentRank: 6 });
    expect(useSkillStore.getState().pendingResourceUnlocks).toEqual([]);
    useSkillStore.setState({ pendingResourceUnlocks: ['influence'] });
    useSkillStore.getState().reset();
    expect(useSkillStore.getState().pendingResourceUnlocks).toEqual([]);
  });

  it('rejects tap modes that are not unlocked yet', () => {
    expect(useSkillStore.getState().setTapResource('capital')).toBe(false);
    expect(useSkillStore.getState().tapResource).toBe('cognitive');
    promoteTo(3);
    expect(useSkillStore.getState().setTapResource('cognitive')).toBe(true);
    expect(useSkillStore.getState().setTapResource('influence')).toBe(false);
  });

  it('buys upgrades only with the required level, rank and currency', () => {
    add({ cognitive: 1e6, influence: 1e6 });
    expect(useSkillStore.getState().buyUpgrade('html-tags-opt-1')).toBe(false);
    useSkillStore.setState({ levels: { ...useSkillStore.getState().levels, 'html-tags': 10 } });
    expect(useSkillStore.getState().buyUpgrade('html-tags-opt-1')).toBe(true);
    expect(useSkillStore.getState().buyUpgrade('html-tags-opt-1')).toBe(false);
    expect(useCurrencyStore.getState().cognitive.toNumber()).toBe(1e6 - 250);
    expect(useSkillStore.getState().buyUpgrade('delegation')).toBe(false);
  });

  it('sanitizes a hydrated snapshot and recomputes rates', () => {
    useSkillStore.getState().hydrate({
      levels: { 'html-tags': 4.7, 'js-basics': -3, unknown: 99, aeropress: 999, sleep: Number.NaN },
      purchasedUpgrades: ['delegation', 'delegation', 'fake'],
      currentRank: 999,
    });
    const state = useSkillStore.getState();
    expect(state.levels['html-tags']).toBe(4);
    expect(state.levels['js-basics']).toBe(0);
    expect(state.levels.aeropress).toBe(15);
    expect(state.levels.sleep).toBe(0);
    expect(state.levels).not.toHaveProperty('unknown');
    expect(state.purchasedUpgrades).toEqual(['delegation']);
    expect(state.currentRank).toBe(10);
    expect(state.tapResource).toBe('influence');
    expect(useCurrencyStore.getState().rates.cognitivePerSec.gt(0)).toBe(true);
  });
});
