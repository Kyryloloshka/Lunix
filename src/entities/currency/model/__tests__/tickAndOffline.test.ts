import { Decimal } from '@shared/lib/decimal';
import {
  FLOW_COMBO_THRESHOLD,
  MAX_OFFLINE_SECONDS,
  MAX_TICK_SECONDS,
  getOfflineSeconds,
  useCurrencyStore,
} from '../currencyStore';

describe('ticks, combo and offline progress', () => {
  beforeEach(() => {
    useCurrencyStore.getState().reset();
  });

  it('keeps the combo between ticks so flow is reachable at a human tap rate', () => {
    const store = useCurrencyStore.getState();
    for (let index = 0; index < FLOW_COMBO_THRESHOLD; index += 1) {
      store.tap();
      store.tick(0.2);
    }
    expect(useCurrencyStore.getState().flow.isActive).toBe(true);
  });

  it('never reports a crit while flow is active', () => {
    const store = useCurrencyStore.getState();
    for (let index = 0; index < FLOW_COMBO_THRESHOLD; index += 1) store.tap();
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0);
    expect(store.tap().isCritical).toBe(false);
    spy.mockRestore();
  });

  it('clamps a huge live tick', () => {
    useCurrencyStore.getState().updateRates({ capitalPerSec: Decimal.from(1) });
    useCurrencyStore.getState().tick(3_600);
    expect(useCurrencyStore.getState().capital.toNumber()).toBeCloseTo(MAX_TICK_SECONDS);
  });

  it('clamps offline time and ignores clocks moved backwards', () => {
    expect(getOfflineSeconds(10_000, 5_000)).toBe(0);
    expect(getOfflineSeconds(0, 5_000)).toBe(0);
    expect(getOfflineSeconds(1, 1 + 1e12)).toBe(MAX_OFFLINE_SECONDS);
    expect(getOfflineSeconds(1_000, 61_000)).toBe(60);
  });

  it('grants offline income and counts it toward lifetime capital', () => {
    useCurrencyStore.getState().updateRates({ capitalPerSec: Decimal.from(2) });
    const earnings = useCurrencyStore.getState().applyOfflineProgress(100);
    expect(earnings.capital.toNumber()).toBeCloseTo(200);
    expect(useCurrencyStore.getState().totalCapitalEarned.toNumber()).toBeCloseTo(200);
  });

  it('taps one resource and counts it toward its lifetime total', () => {
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const study = useCurrencyStore.getState().tap();
    expect(study.resource).toBe('cognitive');
    expect(useCurrencyStore.getState().totalCognitiveEarned.toNumber()).toBe(study.amount.toNumber());
    expect(useCurrencyStore.getState().capital.isZero()).toBe(true);

    const work = useCurrencyStore.getState().tap('capital');
    expect(work.amount.toNumber()).toBe(2);
    expect(useCurrencyStore.getState().totalCapitalEarned.toNumber()).toBe(2);
    spy.mockRestore();
  });

  it('adds 5% of passive income to each tap', () => {
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
    useCurrencyStore.getState().updateRates({ cognitivePerSec: Decimal.from(100) });
    expect(useCurrencyStore.getState().tap('cognitive').amount.toNumber()).toBeCloseTo(1 + 5);
    spy.mockRestore();
  });

  it('counts passive and offline Cognitive toward the lifetime total', () => {
    useCurrencyStore.getState().updateRates({ cognitivePerSec: Decimal.from(3) });
    useCurrencyStore.getState().tick(2);
    useCurrencyStore.getState().applyOfflineProgress(10);
    expect(useCurrencyStore.getState().totalCognitiveEarned.toNumber()).toBeCloseTo(36);
  });

  it('scales tap stress with the skill multiplier', () => {
    useCurrencyStore.getState().updateRates({ stressPerClickMultiplier: 0.5 });
    useCurrencyStore.getState().tap();
    expect(useCurrencyStore.getState().stress).toBeCloseTo(0.175);
  });
});
