import { RHYTHM_CONFIG } from '@entities/currency';

/** Stress above this line throttles output (T-014); the HUD pulses and warns once the player crosses it. */
export const STRESS_ZONE_THRESHOLD = RHYTHM_CONFIG.stress.overloadThreshold;

/** True when stress is inside the throttling zone. Non-finite stress is never in the zone. */
export function isInStressZone(stress: number): boolean {
  return Number.isFinite(stress) && stress > STRESS_ZONE_THRESHOLD;
}

/** Share (0..1) of the Flow timer still left. Clamped; a non-positive total gives 0. */
export function getFlowTimeRatio(remainingMs: number, totalMs: number): number {
  if (!Number.isFinite(remainingMs) || !Number.isFinite(totalMs) || totalMs <= 0) return 0;
  return Math.min(1, Math.max(0, remainingMs / totalMs));
}
