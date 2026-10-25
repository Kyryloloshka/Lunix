import { Decimal } from '../decimal';

/** Default number of pre-formatted frames for a count-up (start and end included). */
export const COUNT_UP_STEPS = 16;
const MAX_STEPS = 60;

/**
 * Pre-formats the text frames of a count-up from `from` to `to`.
 *
 * Interpolation runs in Decimal, so values beyond 1e308 animate correctly; formatting runs once per
 * frame on the JS thread, and the UI thread only picks a frame by index (no React render per frame).
 * Frame 0 is `from`, the last frame is exactly `to`. Consecutive duplicate strings are kept so the
 * frame index stays proportional to progress.
 */
export function buildCountUpFrames(
  from: Decimal,
  to: Decimal,
  format: (value: Decimal) => string,
  steps: number = COUNT_UP_STEPS,
): string[] {
  const finalText = format(to);
  const count = Number.isFinite(steps) ? Math.min(MAX_STEPS, Math.max(2, Math.floor(steps))) : COUNT_UP_STEPS;
  if (from.eq(to)) return [finalText];

  const delta = to.subtract(from);
  const frames: string[] = [];
  for (let i = 0; i < count - 1; i += 1) {
    const t = i / (count - 1);
    frames.push(format(from.add(delta.multiplyScalar(t))));
  }
  frames.push(finalText);
  return frames;
}

/**
 * Maps eased progress (0..1) to a frame index. Worklet-safe: it runs on the UI thread too.
 * Out-of-range or non-finite progress is clamped.
 */
export function frameIndexForProgress(progress: number, frameCount: number): number {
  'worklet';
  if (frameCount <= 1) return 0;
  const p = progress > 1 ? 1 : progress > 0 ? progress : 0;
  return Math.round(p * (frameCount - 1));
}
