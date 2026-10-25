import type { Decimal } from '@shared/lib/decimal';
import type { ResourceAmounts, ResourceRates } from '@entities/currency';
import type { SkillResource } from '@entities/skill';

/** Longer waits are shown as "N more": a guess over an hour is not a useful promise. */
export const MAX_WAIT_SECONDS = 3600;

/** What a disabled buy button says instead of a bare "Buy". */
export type WaitHint =
  | { kind: 'ready' }
  /** Rounded up to whole seconds, 1..MAX_WAIT_SECONDS. */
  | { kind: 'seconds'; seconds: number }
  | { kind: 'more'; amount: Decimal };

/**
 * Income to estimate the wait with: what the player really earned lately (taps included, T-017) or
 * the passive rate, whichever is higher (the window is empty when idle or just back from background).
 */
export function getWaitIncome(resource: SkillResource, income: ResourceAmounts, rates: ResourceRates): Decimal {
  const real = income[resource];
  const passive = resource === 'cognitive' ? rates.cognitivePerSec : resource === 'capital' ? rates.capitalPerSec : rates.influencePerSec;
  // Real income lags a second behind a purchase and drops between taps, which would promise minutes
  // for a moment, so the passive rate is a floor for the estimate.
  return real.gt(passive) ? real : passive;
}

/**
 * Pure: how much is missing and how long it takes at `perSec`. Uses Decimal division, never
 * `toNumber()` of the balances, so costs past 1e308 stay correct.
 */
export function getWaitHint(cost: Decimal, balance: Decimal, perSec: Decimal): WaitHint {
  if (balance.gte(cost)) return { kind: 'ready' };
  const shortfall = cost.subtract(balance);
  if (perSec.isPositive()) {
    const seconds = shortfall.divide(perSec).toNumber();
    if (Number.isFinite(seconds) && seconds <= MAX_WAIT_SECONDS) {
      return { kind: 'seconds', seconds: Math.max(1, Math.ceil(seconds)) };
    }
  }
  return { kind: 'more', amount: shortfall };
}
