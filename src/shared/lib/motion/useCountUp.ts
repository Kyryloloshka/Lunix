import { useEffect, useRef } from 'react';
import type { TextInputProps } from 'react-native';
import { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import type { Decimal } from '../decimal';
import type { DurationToken, EasingToken } from '../../theme/motion';
import { buildCountUpFrames, COUNT_UP_STEPS, frameIndexForProgress } from './countUpFrames';
import { useMotionPreference } from './MotionPreference';
import { timingConfig } from './timing';

export interface CountUpOptions {
  /** Default `base`. */
  duration?: DurationToken | number;
  /** Default `decelerate`. */
  easing?: EasingToken;
  /** Pre-formatted frames per change. Default 16. */
  steps?: number;
}

/**
 * Animates a Decimal's displayed text towards `value` without a React render per frame.
 *
 * On each change the JS thread pre-formats a few frames (Decimal interpolation, so any magnitude
 * works); the UI thread only advances an index. Returns `text` (the final, formatted value: use it
 * for `defaultValue` and accessibility) and `animatedProps` for a Reanimated `TextInput`.
 * Prefer the ready-made `CountUpText` from `@shared/ui`.
 *
 * A change that does not alter the formatted text is ignored. Under reduced motion the text jumps.
 */
export function useCountUp(
  value: Decimal,
  format: (value: Decimal) => string,
  { duration = 'base', easing = 'decelerate', steps = COUNT_UP_STEPS }: CountUpOptions = {},
) {
  const { reducedMotion } = useMotionPreference();
  const text = format(value);

  const frames = useSharedValue<string[]>([text]);
  const progress = useSharedValue(1);
  // JS-side record of the running animation, so a new change starts from what is on screen.
  const fromRef = useRef<Decimal>(value);
  const toRef = useRef<Decimal>(value);
  const formatRef = useRef(format);
  formatRef.current = format;
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    const target = valueRef.current;
    const formatter = formatRef.current;
    const from = fromRef.current;
    const to = toRef.current;
    const p = Math.min(1, Math.max(0, progress.value));
    const current = p >= 1 ? to : from.add(to.subtract(from).multiplyScalar(p));

    fromRef.current = current;
    toRef.current = target;

    const config = timingConfig(duration, reducedMotion, { easing });
    if (config.duration === 0 || current.eq(target)) {
      frames.value = [formatter(target)];
      progress.value = 1;
      return;
    }
    frames.value = buildCountUpFrames(current, target, formatter, steps);
    progress.value = 0;
    progress.value = withTiming(1, config);
    // `text` is the change key: it covers new values and new formatting (notation/locale).
  }, [text, duration, easing, steps, reducedMotion, frames, progress]);

  const animatedProps = useAnimatedProps(() => {
    const list = frames.value;
    const index = frameIndexForProgress(progress.value, list.length);
    return { text: list[index] } as unknown as Partial<TextInputProps>;
  });

  return { text, animatedProps };
}
