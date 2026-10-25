import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useMotionPreference } from '@shared/lib/motion';

const PULSE_HALF_MS = 700;

/**
 * Looping 0..1 value for attention hints. Runs on the native driver and stays at 1 (a static
 * highlight) under reduced motion. The loop is stopped on unmount or when `active` turns false.
 */
export function usePulse(active: boolean): Animated.Value {
  const { reducedMotion } = useMotionPreference();
  const value = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active || reducedMotion) {
      value.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(value, { toValue: 0, duration: PULSE_HALF_MS, useNativeDriver: true }),
      Animated.timing(value, { toValue: 1, duration: PULSE_HALF_MS, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [active, reducedMotion, value]);

  return value;
}
