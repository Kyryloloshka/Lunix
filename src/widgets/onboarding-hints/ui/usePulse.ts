import { useEffect } from 'react';
import {
  cancelAnimation,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { motionEasing, useMotionPreference } from '@shared/lib/motion';
import { durations } from '@shared/theme';

/** One half of the loop (down or up): slow + fast, the same breathing rhythm as the editor cursor. */
const PULSE_HALF_MS = durations.slow + durations.fast + durations.base;

/**
 * Looping 0..1 shared value for attention hints. Runs on the UI thread and stays at 1 (a static
 * highlight) under reduced motion. The loop is stopped on unmount or when `active` turns false.
 */
export function usePulse(active: boolean): SharedValue<number> {
  const { reducedMotion } = useMotionPreference();
  const value = useSharedValue(1);

  useEffect(() => {
    if (!active || reducedMotion) {
      cancelAnimation(value);
      value.value = 1;
      return undefined;
    }
    const config = { duration: PULSE_HALF_MS, easing: motionEasing('standard') };
    value.value = withRepeat(withSequence(withTiming(0, config), withTiming(1, config)), -1);
    return () => cancelAnimation(value);
  }, [active, reducedMotion, value]);

  return value;
}
