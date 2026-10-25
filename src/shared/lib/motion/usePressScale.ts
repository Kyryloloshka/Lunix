import { useCallback, useEffect } from 'react';
import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { PRESS_SCALE, springs, type SpringToken } from '../../theme/motion';
import { useMotionPreference } from './MotionPreference';

export interface PressScaleOptions {
  /** Scale while pressed. Default `PRESS_SCALE` (0.96). */
  scale?: number;
  /** Spring token. Default `press`. */
  spring?: SpringToken;
  /** When true the control does not react (e.g. disabled). */
  disabled?: boolean;
}

/**
 * Press feedback on the UI thread. Spread the handlers onto a `Pressable` and put `animatedStyle`
 * on an `Animated.View` (from `react-native-reanimated`). Under reduced motion the scale stays 1;
 * keep a non-motion pressed state (color/opacity) in the component for feedback.
 */
export function usePressScale({ scale = PRESS_SCALE, spring = 'press', disabled = false }: PressScaleOptions = {}) {
  const { reducedMotion } = useMotionPreference();
  const progress = useSharedValue(1);
  const inactive = reducedMotion || disabled;

  useEffect(() => {
    if (inactive) progress.value = 1;
  }, [inactive, progress]);

  const onPressIn = useCallback(() => {
    if (inactive) return;
    progress.value = withSpring(scale, springs[spring]);
  }, [inactive, progress, scale, spring]);

  const onPressOut = useCallback(() => {
    if (inactive) {
      progress.value = 1;
      return;
    }
    progress.value = withSpring(1, springs[spring]);
  }, [inactive, progress, spring]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: progress.value }] }));

  return { animatedStyle, onPressIn, onPressOut };
}
