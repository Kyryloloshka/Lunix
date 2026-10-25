import { Decimal } from '@shared/lib/decimal';
import {
  EMPTY_INCOME_WINDOW,
  INCOME_GAP_RESET_MS,
  INCOME_WINDOW_MS,
  getIncomePerSec,
  recordIncome,
} from '../income';
import { MAX_OFFLINE_SECONDS, useCurrencyStore } from '../currencyStore';

describe('income window (pure)', () => {
  it('is zero for an empty window', () => {
    const income = getIncomePerSec(EMPTY_INCOME_WINDOW, 1000);
    expect(income.capital.isZero()).toBe(true);
  });

  it('averages earnings over the window span', () => {
    let window = EMPTY_INCOME_WINDOW;
    for (let at = 200; at <= 5000; at += 200) {
      window = recordIncome(window, at, { capital: Decimal.from(2) }, 200);
    }
    // 25 ticks x 2 over 5 s = 10 per second.
    expect(getIncomePerSec(window, 5000).capital.toNumber()).toBeCloseTo(10);
  });

  it('stays exactly at the passive rate while idle even when tick timing jitters', () => {
    // Regression: dividing by wall-clock span made an idle HUD wobble (24 vs 26 ticks in the window).
    const ratePerSec = 7;
    const deltas = [180, 250, 200, 230, 170, 260, 190, 210];
    let window = EMPTY_INCOME_WINDOW;
    let now = 0;
    for (let i = 0; i < 200; i += 1) {
      const delta = deltas[i % deltas.length];
      now += delta;
      window = recordIncome(window, now, { capital: Decimal.from((ratePerSec * delta) / 1000) }, delta);
      if (now >= INCOME_WINDOW_MS) {
        expect(getIncomePerSec(window, now).capital.toNumber()).toBeCloseTo(ratePerSec, 9);
      }
    }
  });

  it('forgets samples older than the window', () => {
    let window = recordIncome(EMPTY_INCOME_WINDOW, 1000, { capital: Decimal.from(1000) }, 1000);
    for (const at of [2000, 3000, 4000, 5000, 1000 + INCOME_WINDOW_MS + 1]) {
      window = recordIncome(window, at, { capital: Decimal.from(1) }, 0);
    }
    // The 1000-sample is out; five samples of 1 over the 5 s span.
    expect(getIncomePerSec(window, 1000 + INCOME_WINDOW_MS + 1).capital.toNumber()).toBeCloseTo(1);
  });

  it('starts over after a gap (background) instead of spreading earnings across it', () => {
    let window = recordIncome(EMPTY_INCOME_WINDOW, 1000, { capital: Decimal.from(100) }, 200);
    const resumeAt = 1000 + INCOME_GAP_RESET_MS + 1;
    window = recordIncome(window, resumeAt, { capital: Decimal.from(1) }, 200);
    // Only the post-gap sample counts, over its own 1 s minimum span.
    expect(getIncomePerSec(window, resumeAt).capital.toNumber()).toBeCloseTo(1);
  });

  it('shows zero when no sample arrived recently', () => {
    const window = recordIncome(EMPTY_INCOME_WINDOW, 1000, { capital: Decimal.from(100) }, 200);
    expect(getIncomePerSec(window, 1000 + INCOME_GAP_RESET_MS + 1).capital.isZero()).toBe(true);
  });

  it('handles values beyond 1e308 without NaN', () => {
    const huge = Decimal.fromLog10(500);
    let window = EMPTY_INCOME_WINDOW;
    for (let at = 1000; at <= 5000; at += 1000) window = recordIncome(window, at, { capital: huge }, 1000);
    const income = getIncomePerSec(window, 5000).capital;
    expect(Number.isNaN(income.mantissa)).toBe(false);
    expect(income.exponent).toBeGreaterThanOrEqual(499);
  });
});

describe('real income in the currency store', () => {
  let now = 0;

  beforeEach(() => {
    now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    useCurrencyStore.getState().reset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('matches the balance gained over 5 s of active tapping (tap + passive + Flow)', () => {
    const store = useCurrencyStore.getState();
    store.updateRates({ capitalPerSec: Decimal.from(10) });
    useCurrencyStore.getState().tick(0.2); // the loop is already running: the window starts here
    const before = useCurrencyStore.getState().capital;

    for (let step = 0; step < 25; step += 1) {
      now += 200;
      useCurrencyStore.getState().tap('capital');
      useCurrencyStore.getState().tick(0.2);
    }

    const state = useCurrencyStore.getState();
    const gained = state.capital.subtract(before).toNumber();
    expect(state.income.capital.toNumber()).toBeCloseTo(gained / 5, 5);
    expect(state.income.capital.gt(state.rates.capitalPerSec)).toBe(true);
    expect(state.income.cognitive.isZero()).toBe(true);
  });

  it('decays to zero when the player stops and no income comes in', () => {
    const store = useCurrencyStore.getState();
    store.tap('cognitive');
    for (let step = 0; step < 40; step += 1) {
      now += 200;
      useCurrencyStore.getState().tick(0.2);
    }
    expect(useCurrencyStore.getState().income.cognitive.isZero()).toBe(true);
  });

  it('does not count offline earnings or a background gap', () => {
    useCurrencyStore.getState().updateRates({ capitalPerSec: Decimal.from(10) });
    for (let step = 0; step < 5; step += 1) {
      now += 200;
      useCurrencyStore.getState().tick(0.2);
    }
    expect(useCurrencyStore.getState().income.capital.toNumber()).toBeGreaterThan(0);

    const earnings = useCurrencyStore.getState().applyOfflineProgress(MAX_OFFLINE_SECONDS);
    expect(earnings.capital.isPositive()).toBe(true);
    expect(useCurrencyStore.getState().income.capital.isZero()).toBe(true);

    // First tick after returning is capped at 5 s and averaged over its own span, not 8 hours.
    now += 60_000;
    useCurrencyStore.getState().tick(0.2);
    expect(useCurrencyStore.getState().income.capital.toNumber()).toBeLessThan(11);
  });
});
