import { Decimal } from '@shared/lib/decimal';
import {
  EMPTY_INCOME_WINDOW,
  INCOME_BUCKET_MS,
  INCOME_GAP_RESET_MS,
  getIncomePerSec,
  recordIncome,
} from '../income';
import { MAX_OFFLINE_SECONDS, useCurrencyStore } from '../currencyStore';

describe('income per second (pure)', () => {
  it('is zero for an empty window', () => {
    const income = getIncomePerSec(EMPTY_INCOME_WINDOW, 1000);
    expect(income.capital.isZero()).toBe(true);
  });

  it('shows the last completed second and changes only once per second', () => {
    let window = EMPTY_INCOME_WINDOW;
    const shown: number[] = [];
    for (let at = 200; at <= 3000; at += 200) {
      window = recordIncome(window, at, { capital: Decimal.from(2) }, 200);
      shown.push(getIncomePerSec(window, at).capital.toNumber());
    }
    // Nothing until the first second is complete, then 5 ticks x 2 = 10 per second.
    expect(shown.slice(0, 4).every((value) => value === 0)).toBe(true);
    expect(shown[4]).toBeCloseTo(10);
    // Between closes the number stays put.
    expect(new Set(shown.slice(4).map((value) => value.toFixed(6))).size).toBe(1);
  });

  it('stays exactly at the passive rate while idle even when tick timing jitters', () => {
    // Regression: dividing by wall-clock time made an idle HUD wobble with a jittery tick timer.
    const ratePerSec = 7;
    const deltas = [180, 250, 200, 230, 170, 260, 190, 210];
    let window = EMPTY_INCOME_WINDOW;
    let now = 0;
    for (let i = 0; i < 200; i += 1) {
      const delta = deltas[i % deltas.length];
      now += delta;
      window = recordIncome(window, now, { capital: Decimal.from((ratePerSec * delta) / 1000) }, delta);
      if (now >= 2 * INCOME_BUCKET_MS) {
        expect(getIncomePerSec(window, now).capital.toNumber()).toBeCloseTo(ratePerSec, 9);
      }
    }
  });

  it('counts taps in the second they happened and drops them the next second', () => {
    let window = EMPTY_INCOME_WINDOW;
    let now = 0;
    for (let i = 0; i < 5; i += 1) {
      now += 200;
      window = recordIncome(window, now, { capital: Decimal.from(50) }, 0); // tap
      window = recordIncome(window, now, { capital: Decimal.from(2) }, 200); // passive 10/s
    }
    expect(getIncomePerSec(window, now).capital.toNumber()).toBeCloseTo(260);
    for (let i = 0; i < 5; i += 1) {
      now += 200;
      window = recordIncome(window, now, { capital: Decimal.from(2) }, 200);
    }
    expect(getIncomePerSec(window, now).capital.toNumber()).toBeCloseTo(10);
  });

  it('starts over after a gap (background) instead of spreading earnings across it', () => {
    let window = EMPTY_INCOME_WINDOW;
    for (let at = 200; at <= 1000; at += 200) window = recordIncome(window, at, { capital: Decimal.from(100) }, 200);
    const resumeAt = 1000 + INCOME_GAP_RESET_MS + 1;
    window = recordIncome(window, resumeAt, { capital: Decimal.from(1) }, 200);
    // The pre-gap second is forgotten and the new one is not complete yet.
    expect(getIncomePerSec(window, resumeAt).capital.isZero()).toBe(true);
  });

  it('shows zero when nothing arrived recently', () => {
    let window = EMPTY_INCOME_WINDOW;
    for (let at = 200; at <= 1000; at += 200) window = recordIncome(window, at, { capital: Decimal.from(100) }, 200);
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

  it('matches the balance gained in the last second of active tapping (tap + passive + Flow)', () => {
    const store = useCurrencyStore.getState();
    store.updateRates({ capitalPerSec: Decimal.from(10) });
    // Run a few seconds so the measured second is a full one in the middle of play.
    for (let step = 0; step < 20; step += 1) {
      now += 200;
      useCurrencyStore.getState().tap('capital');
      useCurrencyStore.getState().tick(0.2);
    }
    const before = useCurrencyStore.getState().capital;

    for (let step = 0; step < 5; step += 1) {
      now += 200;
      useCurrencyStore.getState().tap('capital');
      useCurrencyStore.getState().tick(0.2);
    }

    const state = useCurrencyStore.getState();
    const gained = state.capital.subtract(before).toNumber();
    expect(state.income.capital.toNumber()).toBeCloseTo(gained, 5);
    expect(state.income.capital.gt(state.rates.capitalPerSec)).toBe(true);
    expect(state.income.cognitive.isZero()).toBe(true);
  });

  it('falls back to the passive rate within two seconds after the player stops tapping', () => {
    useCurrencyStore.getState().updateRates({ capitalPerSec: Decimal.from(10) });
    // 10 taps stay under the Flow threshold, which would triple passive income for 10 s.
    for (let step = 0; step < 10; step += 1) {
      now += 200;
      useCurrencyStore.getState().tap('capital');
      useCurrencyStore.getState().tick(0.2);
    }
    expect(useCurrencyStore.getState().income.capital.toNumber()).toBeGreaterThan(10);
    for (let step = 0; step < 10; step += 1) {
      now += 200;
      useCurrencyStore.getState().tick(0.2);
    }
    expect(useCurrencyStore.getState().income.capital.toNumber()).toBeCloseTo(10, 6);
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
