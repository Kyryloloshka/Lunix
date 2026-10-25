/**
 * Motion tokens (T-015). Every animation takes its duration and curve from here so the game moves
 * with one rhythm and reduced motion can switch movement off in one place.
 *
 * This module is pure data + pure functions (no Reanimated import), so it is unit-testable and safe to
 * use from anywhere. Reanimated helpers convert the curves with `Easing.bezier(...)`.
 */

/** Durations in milliseconds. */
export const durations = {
  /** Micro feedback: press-in, toggles. */
  instant: 90,
  /** Small state changes: press-out, fades of small elements. */
  fast: 160,
  /** Default enter/exit, count-ups, tab transitions. */
  base: 240,
  /** Larger surfaces: panels, sheets, emphasized entrances. */
  slow: 400,
  /** Celebrations: promotion, Flow start. */
  celebrate: 1200,
} as const;

export type DurationToken = keyof typeof durations;

/** Cubic-bezier control points `[x1, y1, x2, y2]`. */
export type BezierCurve = readonly [number, number, number, number];

export const easings = {
  /** Default curve for most transitions. */
  standard: [0.2, 0, 0, 1],
  /** Entrances that should feel energetic (slight overshoot-free punch). */
  emphasized: [0.05, 0.7, 0.1, 1],
  /** Elements entering the screen. */
  decelerate: [0, 0, 0, 1],
  /** Elements leaving the screen. */
  accelerate: [0.3, 0, 1, 1],
} as const satisfies Record<string, BezierCurve>;

export type EasingToken = keyof typeof easings;

/** Spring config for pressable feedback (Reanimated `withSpring` shape). */
export interface SpringConfig {
  damping: number;
  stiffness: number;
  mass: number;
}

export const springs = {
  /** Snappy, barely bouncing press feedback. */
  press: { damping: 18, stiffness: 420, mass: 0.6 },
  /** Playful pop for badges and celebrations. */
  pop: { damping: 12, stiffness: 260, mass: 0.8 },
} as const satisfies Record<string, SpringConfig>;

export type SpringToken = keyof typeof springs;

/** Default scale a pressed control shrinks to. */
export const PRESS_SCALE = 0.96;

/** Default distance (dp) for slide-in entrances. */
export const SLIDE_DISTANCE = 12;

/**
 * What kind of change an animation represents.
 * - `motion`: position, scale, rotation. Disabled entirely under reduced motion.
 * - `fade`: opacity/color only. Kept under reduced motion, but never longer than `fast`.
 */
export type MotionKind = 'motion' | 'fade';

/**
 * Resolves a duration token (or explicit ms) for the current motion preference.
 * Reduced motion: movement becomes instant (0 ms), fades are capped at `fast`.
 * Invalid input (negative, NaN, Infinity) resolves to 0.
 */
export function resolveDuration(
  duration: DurationToken | number,
  reducedMotion: boolean,
  kind: MotionKind = 'motion',
): number {
  const ms = typeof duration === 'number' ? duration : durations[duration];
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  if (!reducedMotion) return ms;
  return kind === 'fade' ? Math.min(ms, durations.fast) : 0;
}

/**
 * Combines the player's in-game choice with the OS accessibility flag. `null` means the player never
 * chose, so the OS setting applies; an explicit choice (on or off) always wins (T-006).
 */
export function isReducedMotion(gameChoice: boolean | null, osSetting: boolean): boolean {
  return gameChoice ?? osSetting;
}
