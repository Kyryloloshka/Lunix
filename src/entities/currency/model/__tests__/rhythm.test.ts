import { Decimal } from '@shared/lib/decimal';
import { MAX_TICK_SECONDS, useCurrencyStore } from '../currencyStore';
import {
  RHYTHM_CONFIG,
  getResilienceMultiplier,
  getStressDecay,
  getStressReductionPercent,
  toCountdownSeconds,
} from '../rhythm';

const { flow: FLOW, stress: STRESS, resilience: RESILIENCE } = RHYTHM_CONFIG;

/** Drives the store with a fake clock so combo windows and rest delays are deterministic. */
function createClock(start = 1_000_000) {
  let now = start;
  const spy = jest.spyOn(Date, 'now').mockImplementation(() => now);
  return {
    get now() { return now; },
    advance(ms: number) { now += ms; },
    /** Advance time and tick the store in 200 ms steps, like the live game loop. */
    run(ms: number, step = 200) {
      for (let elapsed = 0; elapsed < ms; elapsed += step) {
        now += step;
        useCurrencyStore.getState().tick(step / 1000);
      }
    },
    restore: () => spy.mockRestore(),
  };
}

function enterFlow(clock: ReturnType<typeof createClock>) {
  for (let index = 0; index < FLOW.comboThreshold; index += 1) {
    useCurrencyStore.getState().tap();
    clock.advance(100);
  }
  expect(useCurrencyStore.getState().flow.isActive).toBe(true);
}

describe('resilience curve', () => {
  it('is neutral at zero and for invalid or negative input', () => {
    expect(getResilienceMultiplier(Decimal.ZERO)).toBe(1);
    expect(getResilienceMultiplier(Decimal.from(-500))).toBe(1);
    expect(getResilienceMultiplier(Decimal.from(Number.NaN))).toBe(1);
    expect(getResilienceMultiplier(Decimal.fromJSON({ m: 'x', e: 3 }))).toBe(1);
  });

  it('grows with diminishing returns', () => {
    const at1 = getResilienceMultiplier(Decimal.from(1));
    const at1e3 = getResilienceMultiplier(Decimal.from(1e3));
    const at1e6 = getResilienceMultiplier(Decimal.from(1e6));
    expect(at1).toBeCloseTo(1 / (1 + RESILIENCE.k * Math.log10(2)));
    expect(at1e6).toBeCloseTo(1 / (1 + RESILIENCE.k * 6), 5);
    expect(at1).toBeGreaterThan(at1e3);
    expect(at1e3).toBeGreaterThan(at1e6);
    // Each extra 1000× buys less than the previous one.
    expect(at1 - at1e3).toBeGreaterThan(at1e3 - at1e6);
  });

  it('stays bounded beyond 1e308', () => {
    const huge = Decimal.fromLog10(5_000);
    expect(getResilienceMultiplier(huge)).toBe(RESILIENCE.minMultiplier);
    expect(getResilienceMultiplier(new Decimal(9.99, 1e15))).toBe(RESILIENCE.minMultiplier);
    expect(Number.isFinite(getResilienceMultiplier(Decimal.fromLog10(309)))).toBe(true);
  });

  it('reports the reduction as a whole percent', () => {
    expect(getStressReductionPercent(1)).toBe(0);
    expect(getStressReductionPercent(0.77)).toBe(23);
    expect(getStressReductionPercent(Number.NaN)).toBe(0);
    expect(getStressReductionPercent(-1)).toBe(100);
  });

  it('comes from lifetime Cognitive, so spending does not lower it', () => {
    useCurrencyStore.getState().reset();
    useCurrencyStore.getState().addResources({ cognitive: Decimal.from(1e6) });
    const before = useCurrencyStore.getState();
    const multiplierBefore = getResilienceMultiplier(before.totalCognitiveEarned);
    expect(before.spendResources({ cognitive: Decimal.from(1e6) })).toBe(true);
    const after = useCurrencyStore.getState();
    expect(after.cognitive.isZero()).toBe(true);
    expect(getResilienceMultiplier(after.totalCognitiveEarned)).toBe(multiplierBefore);
  });
});

describe('stress decay', () => {
  it('uses the normal rate while tapping and the rest rate after the rest delay', () => {
    expect(getStressDecay(1, 0)).toBeCloseTo(STRESS.decayPerSec);
    expect(getStressDecay(1, STRESS.restDelayMs)).toBeCloseTo(STRESS.decayPerSec);
    expect(getStressDecay(1, STRESS.restDelayMs + 1_000)).toBeCloseTo(STRESS.restDecayPerSec);
    // Half the tick is past the rest delay.
    expect(getStressDecay(1, STRESS.restDelayMs + 500))
      .toBeCloseTo(0.5 * STRESS.restDecayPerSec + 0.5 * STRESS.decayPerSec);
  });

  it('ignores invalid deltas and treats a missing tap time as rest', () => {
    expect(getStressDecay(-1, 0)).toBe(0);
    expect(getStressDecay(Number.NaN, 0)).toBe(0);
    expect(getStressDecay(2, Number.NaN)).toBeCloseTo(2 * STRESS.restDecayPerSec);
  });

  it('cools from 70% to nearly zero after 30-40 s of rest', () => {
    useCurrencyStore.getState().reset();
    const clock = createClock();
    useCurrencyStore.getState().tap();
    useCurrencyStore.getState().addStress(70 - useCurrencyStore.getState().stress);
    clock.run(38_000);
    expect(useCurrencyStore.getState().stress).toBeLessThan(3);
    clock.restore();
  });

  it('clamps a huge live tick, so a background resume cannot wipe stress or pay hours', () => {
    useCurrencyStore.getState().reset();
    const clock = createClock();
    useCurrencyStore.getState().addStress(70);
    useCurrencyStore.getState().updateRates({ capitalPerSec: Decimal.from(1) });
    clock.advance(3_600_000);
    useCurrencyStore.getState().tick(3_600);
    const state = useCurrencyStore.getState();
    expect(state.capital.toNumber()).toBeCloseTo(MAX_TICK_SECONDS);
    expect(state.stress).toBeCloseTo(70 - MAX_TICK_SECONDS * STRESS.restDecayPerSec);
    clock.restore();
  });

  it('applies resilience and soft skills to tap stress', () => {
    useCurrencyStore.getState().reset();
    useCurrencyStore.getState().addResources({ cognitive: Decimal.from(1e6) });
    useCurrencyStore.getState().updateRates({ stressPerClickMultiplier: 0.5 });
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
    useCurrencyStore.getState().tap('capital');
    spy.mockRestore();
    const expected = STRESS.perTap * 0.5 * getResilienceMultiplier(Decimal.from(1e6));
    expect(useCurrencyStore.getState().stress).toBeCloseTo(expected);
  });
});

describe('flow threshold and cooldown', () => {
  let clock: ReturnType<typeof createClock>;
  beforeEach(() => {
    useCurrencyStore.getState().reset();
    clock = createClock();
  });
  afterEach(() => clock.restore());

  it('needs the full combo inside one window', () => {
    for (let index = 0; index < FLOW.comboThreshold - 1; index += 1) {
      useCurrencyStore.getState().tap();
      clock.advance(150);
    }
    expect(useCurrencyStore.getState().flow.isActive).toBe(false);
    // 3 taps/s (the old easy pace) never reaches Flow: the window expires first.
    useCurrencyStore.getState().reset();
    for (let index = 0; index < 60; index += 1) {
      useCurrencyStore.getState().tap();
      clock.run(333, 333);
    }
    expect(useCurrencyStore.getState().flow.isActive).toBe(false);
  });

  it('exposes the combo countdown from the model and refreshes it on tick', () => {
    useCurrencyStore.getState().tap();
    expect(useCurrencyStore.getState().flow.comboRemainingMs).toBe(FLOW.comboWindowMs);
    clock.run(1_400);
    expect(toCountdownSeconds(useCurrencyStore.getState().flow.comboRemainingMs)).toBe(3);
    clock.run(2_800);
    expect(useCurrencyStore.getState().flow.comboCount).toBe(0);
    expect(useCurrencyStore.getState().flow.comboRemainingMs).toBe(0);
  });

  it('locks the combo during the cooldown after Flow ends', () => {
    enterFlow(clock);
    clock.run(FLOW.durationMs);
    let flow = useCurrencyStore.getState().flow;
    expect(flow.isActive).toBe(false);
    expect(flow.comboCount).toBe(0);
    expect(flow.cooldownRemainingMs).toBe(FLOW.cooldownMs);

    for (let index = 0; index < FLOW.comboThreshold * 2; index += 1) {
      useCurrencyStore.getState().tap();
      clock.run(100, 100);
    }
    flow = useCurrencyStore.getState().flow;
    expect(flow.isActive).toBe(false);
    expect(flow.comboCount).toBe(0);

    clock.run(FLOW.cooldownMs);
    expect(useCurrencyStore.getState().flow.cooldownRemainingMs).toBe(0);
    enterFlow(clock);
  });

  it('carries the rest of a tick into the cooldown when Flow ends mid-tick', () => {
    enterFlow(clock);
    clock.run(FLOW.durationMs - 1_000);
    expect(useCurrencyStore.getState().flow.remainingMs).toBe(1_000);
    clock.advance(MAX_TICK_SECONDS * 1000);
    useCurrencyStore.getState().tick(MAX_TICK_SECONDS);
    const flow = useCurrencyStore.getState().flow;
    expect(flow.isActive).toBe(false);
    expect(flow.cooldownRemainingMs).toBe(FLOW.cooldownMs - (MAX_TICK_SECONDS * 1000 - 1_000));
  });

  it('clears Flow and cooldown after offline time', () => {
    enterFlow(clock);
    useCurrencyStore.getState().addStress(50);
    useCurrencyStore.getState().applyOfflineProgress(60);
    const state = useCurrencyStore.getState();
    expect(state.flow.isActive).toBe(false);
    expect(state.flow.cooldownRemainingMs).toBe(0);
    expect(state.stress).toBe(0);
  });
});

/**
 * Short balance simulation: a fixed tap pattern for 10 minutes with the live 200 ms loop.
 * Returns the share of time spent in Flow and when overload (70%) first started.
 */
function simulate(tapsPerSec: number, sprintSec: number, restSec: number, minutes = 10) {
  useCurrencyStore.getState().reset();
  const clock = createClock();
  const step = 200;
  const totalMs = minutes * 60_000;
  const tapEveryMs = 1000 / tapsPerSec;
  let nextTapAt = 0;
  let flowMs = 0;
  let overloadAtMs: number | null = null;
  const spy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
  for (let elapsed = 0; elapsed < totalMs; elapsed += step) {
    const cycle = (elapsed / 1000) % (sprintSec + restSec);
    const tapping = cycle < sprintSec;
    while (nextTapAt < elapsed + step) {
      if (tapping) {
        // Taps land at their own timestamps inside the tick.
        const offset = nextTapAt - elapsed;
        clock.advance(offset);
        useCurrencyStore.getState().tap();
        clock.advance(-offset);
      }
      nextTapAt += tapEveryMs;
    }
    if (useCurrencyStore.getState().flow.isActive) flowMs += step;
    clock.advance(step);
    useCurrencyStore.getState().tick(step / 1000);
    if (overloadAtMs === null && useCurrencyStore.getState().stress >= STRESS.overloadThreshold) {
      overloadAtMs = elapsed + step;
    }
  }
  spy.mockRestore();
  clock.restore();
  const result = { flowShare: flowMs / totalMs, overloadAtSec: overloadAtMs === null ? null : overloadAtMs / 1000 };
  if (process.env.RHYTHM_DEBUG) console.log(tapsPerSec, sprintSec, restSec, result);
  return result;
}

describe('rhythm balance simulation (10 min)', () => {
  it('keeps Flow an event for non-stop fast tapping', () => {
    for (const rate of [6, 8, 10]) {
      expect(simulate(rate, 600, 0).flowShare).toBeLessThanOrEqual(0.3);
    }
  });

  it('keeps Flow at or below 30% for a sprint/rest rhythm', () => {
    const { flowShare } = simulate(6, 30, 10);
    expect(flowShare).toBeGreaterThan(0.1);
    expect(flowShare).toBeLessThanOrEqual(0.3);
  });

  it('starts overload after roughly 60-90 s of continuous tapping', () => {
    const { overloadAtSec } = simulate(6, 600, 0, 3);
    expect(overloadAtSec).not.toBeNull();
    expect(overloadAtSec!).toBeGreaterThanOrEqual(60);
    expect(overloadAtSec!).toBeLessThanOrEqual(90);
  });
});
