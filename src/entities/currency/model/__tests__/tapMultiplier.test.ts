import { CRIT_MULTIPLIER, FLOW_COMBO_THRESHOLD, TAP_BASE, useCurrencyStore } from '../currencyStore';

// T-009: the editor shows "CRIT ×N" and types faster from the multiplier the tap really applied.
describe('tap result multiplier', () => {
  beforeEach(() => {
    useCurrencyStore.getState().reset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reports 1 for a plain tap', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const result = useCurrencyStore.getState().tap();
    expect(result.isCritical).toBe(false);
    expect(result.multiplier).toBe(1);
  });

  it('reports the crit multiplier that was paid out', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const result = useCurrencyStore.getState().tap();
    expect(result.isCritical).toBe(true);
    expect(result.multiplier).toBe(CRIT_MULTIPLIER);
    expect(result.amount.toNumber()).toBeCloseTo(TAP_BASE.cognitive.toNumber() * CRIT_MULTIPLIER);
  });

  it('reports the Flow multiplier during Flow', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const store = useCurrencyStore.getState();
    for (let index = 0; index < FLOW_COMBO_THRESHOLD; index += 1) store.tap();
    const result = useCurrencyStore.getState().tap();
    expect(result.multiplier).toBe(useCurrencyStore.getState().flow.multiplier);
  });
});
