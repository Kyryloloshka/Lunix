import { Decimal } from '@shared/lib/decimal';
import { useCurrencyStore } from '@entities/currency';
import { useSkillStore } from '../model/skillStore';

describe('skill store', () => {
  beforeEach(() => {
    useCurrencyStore.getState().reset();
    useSkillStore.getState().reset();
  });

  it('buys with the live balance and syncs rates', () => {
    useCurrencyStore.getState().addResources({ capital: Decimal.from(15) });
    expect(useSkillStore.getState().buy('html-css')).toBe(1);
    expect(useCurrencyStore.getState().capital.isZero()).toBe(true);
    expect(useCurrencyStore.getState().rates.capitalPerSec.toNumber()).toBeCloseTo(0.5);
  });

  it('only promotes one rank when requirements are met', () => {
    expect(useSkillStore.getState().promote()).toBe(false);
    useCurrencyStore.getState().addResources({ capital: Decimal.from(1e20), influence: Decimal.from(1e20) });
    expect(useSkillStore.getState().promote()).toBe(true);
    expect(useSkillStore.getState().currentRank).toBe(1);
  });

  it('sanitizes a hydrated snapshot', () => {
    useSkillStore.getState().hydrate({
      levels: { 'html-css': 4.7, react: -3, unknown: 99, coffee: Number.NaN },
      purchasedUpgrades: ['tailwind-macro', 'tailwind-macro', 'fake'],
      currentRank: 999,
    });
    const state = useSkillStore.getState();
    expect(state.levels['html-css']).toBe(4);
    expect(state.levels.react).toBe(0);
    expect(state.levels.coffee).toBe(0);
    expect(state.levels).not.toHaveProperty('unknown');
    expect(state.purchasedUpgrades).toEqual(['tailwind-macro']);
    expect(state.currentRank).toBe(8);
    expect(useCurrencyStore.getState().rates.capitalPerSec.gt(0)).toBe(true);
  });
});
