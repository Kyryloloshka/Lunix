import {
  FLOW_COMBO_THRESHOLD,
  getStressOutputMultiplier,
  getStressPenaltyPercent,
  useCurrencyStore,
} from '../currencyStore';

describe('stress output and flow combo', () => {
  beforeEach(() => {
    useCurrencyStore.getState().reset();
  });

  it('activates flow after the visible combo target', () => {
    const store = useCurrencyStore.getState();

    for (let index = 0; index < FLOW_COMBO_THRESHOLD - 1; index += 1) {
      store.tap();
    }
    expect(useCurrencyStore.getState().flow.isActive).toBe(false);
    expect(useCurrencyStore.getState().flow.comboCount).toBe(FLOW_COMBO_THRESHOLD - 1);

    store.tap();
    expect(useCurrencyStore.getState().flow.isActive).toBe(true);
    expect(useCurrencyStore.getState().flow.remainingMs).toBeGreaterThan(0);
  });

  it('clearly reduces output after overload begins', () => {
    expect(getStressOutputMultiplier(70)).toBe(1);
    expect(getStressOutputMultiplier(100)).toBe(0.5);
    expect(getStressPenaltyPercent(100)).toBe(50);
  });

  it('does not increase combo while flow is active', () => {
    const store = useCurrencyStore.getState();
    for (let index = 0; index < FLOW_COMBO_THRESHOLD; index += 1) store.tap();

    const activeCount = useCurrencyStore.getState().flow.comboCount;
    store.tap();
    expect(useCurrencyStore.getState().flow.comboCount).toBe(activeCount);
  });
});
