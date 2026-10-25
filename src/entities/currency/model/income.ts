import { Decimal } from '@shared/lib/decimal';
import type { TapResource } from './types';

/**
 * Real income is measured in whole seconds: earnings collect in the current second and the HUD shows
 * the last completed one, so the number updates once per second and settles back to passive income
 * within a second or two after the player stops tapping.
 */
export const INCOME_BUCKET_MS = 1000;
/** A longer silence between records means the app was in the background: measuring starts over. */
export const INCOME_GAP_RESET_MS = 2000;

export type ResourceAmounts = Record<TapResource, Decimal>;

/** Runtime-only record of what the player really earned recently (taps, passive, Flow, stress). */
export interface IncomeWindow {
  /** Earned so far in the second being measured. */
  pending: ResourceAmounts;
  /** Game time the pending earnings cover: ticks add their delta, taps add none. */
  pendingCoveredMs: number;
  /** Per-second income of the last completed second: what the HUD shows. */
  lastRate: ResourceAmounts;
  /** When anything was last recorded; 0 = nothing yet. */
  lastAt: number;
}

export const ZERO_AMOUNTS: ResourceAmounts = {
  capital: Decimal.ZERO,
  cognitive: Decimal.ZERO,
  influence: Decimal.ZERO,
};

export const EMPTY_INCOME_WINDOW: IncomeWindow = {
  pending: ZERO_AMOUNTS,
  pendingCoveredMs: 0,
  lastRate: ZERO_AMOUNTS,
  lastAt: 0,
};

function addAmounts(a: ResourceAmounts, b: Partial<ResourceAmounts>): ResourceAmounts {
  return {
    capital: b.capital ? a.capital.add(b.capital) : a.capital,
    cognitive: b.cognitive ? a.cognitive.add(b.cognitive) : a.cognitive,
    influence: b.influence ? a.influence.add(b.influence) : a.influence,
  };
}

/**
 * Pure: adds what was just earned. `coveredMs` is the game time a tick represents; a second closes
 * once ticks have covered `INCOME_BUCKET_MS`, and its rate divides by exactly that covered time, so
 * a jittery tick timer cannot make an idle player's number wobble. Offline earnings are never recorded.
 */
export function recordIncome(
  window: IncomeWindow,
  now: number,
  earned: Partial<ResourceAmounts>,
  coveredMs = 0,
): IncomeWindow {
  if (!Number.isFinite(now)) return window;
  const restart = window.lastAt === 0 || now < window.lastAt || now - window.lastAt > INCOME_GAP_RESET_MS;
  const base = restart ? EMPTY_INCOME_WINDOW : window;
  const pending = addAmounts(base.pending, earned);
  const pendingCoveredMs = base.pendingCoveredMs + (Number.isFinite(coveredMs) ? Math.max(0, coveredMs) : 0);
  if (pendingCoveredMs < INCOME_BUCKET_MS) {
    return { pending, pendingCoveredMs, lastRate: base.lastRate, lastAt: now };
  }
  const perSecond = 1000 / pendingCoveredMs;
  return {
    pending: ZERO_AMOUNTS,
    pendingCoveredMs: 0,
    lastRate: {
      capital: pending.capital.multiplyScalar(perSecond),
      cognitive: pending.cognitive.multiplyScalar(perSecond),
      influence: pending.influence.multiplyScalar(perSecond),
    },
    lastAt: now,
  };
}

/** Pure: income per second of the last completed second; zero once the game has been away. */
export function getIncomePerSec(window: IncomeWindow, now: number): ResourceAmounts {
  if (window.lastAt === 0 || !Number.isFinite(now) || now - window.lastAt > INCOME_GAP_RESET_MS) return ZERO_AMOUNTS;
  return window.lastRate;
}
