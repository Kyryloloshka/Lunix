import { Decimal } from '@shared/lib/decimal';

/**
 * Micro-loop tuning (T-014): Flow is an event, stress is a sprint/rest rhythm, and lifetime Cognitive
 * buys resilience. Numbers are data, checked by the rhythm simulation test.
 */
export const RHYTHM_CONFIG = {
  flow: {
    /** Taps needed inside one combo window: 20 in 4 s means a deliberate ~5 taps/s. */
    comboThreshold: 20,
    comboWindowMs: 4_000,
    durationMs: 10_000,
    multiplier: 3,
    /** After Flow ends the combo cannot build for this long, so Flow stays an event (≤ 30% of play). */
    cooldownMs: 24_000,
  },
  stress: {
    max: 100,
    overloadThreshold: 70,
    overloadMinOutput: 0.5,
    perTap: 0.25,
    /** Decay while the player keeps tapping. */
    decayPerSec: 0.25,
    /** Decay once the player has rested for `restDelayMs`: 70% → 0 in ~35 s. */
    restDecayPerSec: 2,
    restDelayMs: 2_000,
  },
  resilience: {
    /** stressPerTap × 1 / (1 + k · log10(1 + totalCognitiveEarned)). */
    k: 0.1,
    /** Floor of the multiplier: resilience never removes more than 65% of tap stress. */
    minMultiplier: 0.35,
  },
} as const;

/**
 * Stress removed over `deltaSeconds` that ended `msSinceLastTap` after the last tap.
 * Only the part of the interval past the rest delay decays at the rest rate.
 */
export function getStressDecay(deltaSeconds: number, msSinceLastTap: number): number {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return 0;
  const { decayPerSec, restDecayPerSec, restDelayMs } = RHYTHM_CONFIG.stress;
  const idleMs = Number.isFinite(msSinceLastTap) ? Math.max(0, msSinceLastTap) : Number.POSITIVE_INFINITY;
  const restSeconds = Math.min(deltaSeconds, Math.max(0, (idleMs - restDelayMs) / 1000));
  return restSeconds * restDecayPerSec + (deltaSeconds - restSeconds) * decayPerSec;
}

/** log10(1 + x) for a non-negative Decimal, safe beyond 1e308. Invalid or negative input gives 0. */
function log10OnePlus(value: Decimal): number {
  if (value.isZero() || value.isNegative()) return 0;
  // Past ~1e15 the +1 is below float precision, so work from mantissa/exponent directly.
  if (value.exponent >= 15) return Math.log10(value.mantissa) + value.exponent;
  const result = Math.log10(1 + value.toNumber());
  return Number.isFinite(result) ? result : 0;
}

/** Tap-stress multiplier from lifetime Cognitive: diminishing returns, floored at `minMultiplier`. */
export function getResilienceMultiplier(totalCognitiveEarned: Decimal): number {
  const { k, minMultiplier } = RHYTHM_CONFIG.resilience;
  const log = log10OnePlus(totalCognitiveEarned);
  const multiplier = 1 / (1 + k * log);
  if (!Number.isFinite(multiplier)) return minMultiplier;
  return Math.min(1, Math.max(minMultiplier, multiplier));
}

/** Whole percent of tap stress removed by a multiplier (0.77 → 23). */
export function getStressReductionPercent(multiplier: number): number {
  if (!Number.isFinite(multiplier)) return 0;
  return Math.round((1 - Math.min(1, Math.max(0, multiplier))) * 100);
}

/** Whole seconds shown for a countdown; 0 only when nothing is left. */
export function toCountdownSeconds(remainingMs: number): number {
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / 1000);
}
