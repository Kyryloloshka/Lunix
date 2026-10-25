import { Decimal } from '@shared/lib/decimal';
import type { TapResource } from './types';

/** Real income is averaged over this window so one big tap does not swing the HUD number. */
export const INCOME_WINDOW_MS = 5000;
/** A longer silence between records means the app was in the background: the window starts over. */
export const INCOME_GAP_RESET_MS = 2000;
/** The average never divides by less than this, so the very first sample is not shown as a huge rate. */
const MIN_SPAN_MS = 1000;

export type ResourceAmounts = Record<TapResource, Decimal>;

interface IncomeSample {
  at: number;
  earned: ResourceAmounts;
  /** Time this sample stands for: a tick covers its delta, a tap covers none. */
  coveredMs: number;
}

/** Runtime-only record of what the player really earned recently (taps, passive, Flow, stress). */
export interface IncomeWindow {
  samples: readonly IncomeSample[];
  /** Start of the continuous foreground stretch the samples belong to. */
  startedAt: number;
}

export const EMPTY_INCOME_WINDOW: IncomeWindow = { samples: [], startedAt: 0 };

export const ZERO_AMOUNTS: ResourceAmounts = {
  capital: Decimal.ZERO,
  cognitive: Decimal.ZERO,
  influence: Decimal.ZERO,
};

/**
 * Pure: adds what was just earned. `coveredMs` is the time a tick represents (so the first tick
 * after a reset counts its own duration). Offline earnings and rewards are never recorded here.
 */
export function recordIncome(
  window: IncomeWindow,
  now: number,
  earned: Partial<ResourceAmounts>,
  coveredMs = 0,
): IncomeWindow {
  if (!Number.isFinite(now)) return window;
  const last = window.samples.at(-1);
  const restart = last === undefined || now < last.at || now - last.at > INCOME_GAP_RESET_MS;
  const base = restart ? [] : window.samples;
  const startedAt = restart ? now - Math.max(0, coveredMs) : window.startedAt;
  const cutoff = now - INCOME_WINDOW_MS;
  const kept = base.filter((sample) => sample.at > cutoff);
  const covered = Number.isFinite(coveredMs) ? Math.max(0, coveredMs) : 0;
  return { samples: [...kept, { at: now, earned: { ...ZERO_AMOUNTS, ...earned }, coveredMs: covered }], startedAt };
}

/** Pure: average earnings per second over the last window, per resource. */
export function getIncomePerSec(window: IncomeWindow, now: number): ResourceAmounts {
  const last = window.samples.at(-1);
  if (last === undefined || !Number.isFinite(now) || now - last.at > INCOME_GAP_RESET_MS) return ZERO_AMOUNTS;
  const cutoff = now - INCOME_WINDOW_MS;
  const totals: ResourceAmounts = { ...ZERO_AMOUNTS };
  let coveredMs = 0;
  for (const sample of window.samples) {
    if (sample.at <= cutoff) continue;
    coveredMs += sample.coveredMs;
    totals.capital = totals.capital.add(sample.earned.capital);
    totals.cognitive = totals.cognitive.add(sample.earned.cognitive);
    totals.influence = totals.influence.add(sample.earned.influence);
  }
  // Divide by the time the samples actually cover, not by wall-clock span: tick timers jitter, so a
  // fixed window holds 24 or 26 ticks in turn and a wall-clock average wobbles even when idle.
  // Earnings and covered time come from the same samples, so the ratio is exact; taps alone (no tick yet)
  // fall back to the wall-clock span.
  const spanMs = coveredMs > 0 ? coveredMs : Math.min(INCOME_WINDOW_MS, now - window.startedAt);
  const spanSeconds = Math.max(MIN_SPAN_MS, spanMs) / 1000;
  return {
    capital: totals.capital.multiplyScalar(1 / spanSeconds),
    cognitive: totals.cognitive.multiplyScalar(1 / spanSeconds),
    influence: totals.influence.multiplyScalar(1 / spanSeconds),
  };
}
