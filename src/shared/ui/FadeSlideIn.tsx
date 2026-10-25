import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { timingConfig, useMotionPreference } from '@shared/lib/motion';
import { SLIDE_DISTANCE, type DurationToken, type EasingToken } from '@shared/theme';

export type SlideFrom = 'top' | 'bottom' | 'left' | 'right';

interface FadeSlideInProps {
  children: ReactNode;
  /** Edge the content slides in from. Default `bottom`. */
  from?: SlideFrom;
  /** Slide distance in dp. Default `SLIDE_DISTANCE` (12). */
  distance?: number;
  /** Default `base`. */
  duration?: DurationToken | number;
  /** Default `emphasized`. */
  easing?: EasingToken;
  /** Delay in ms before starting (e.g. for staggered lists). Default 0. */
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Mount entrance: fades in while sliding from `from`. Runs on the UI thread.
 * Under reduced motion there is no slide, only a short fade.
 */
export function FadeSlideIn({
  children,
  from = 'bottom',
  distance = SLIDE_DISTANCE,
  duration = 'base',
  easing = 'emphasized',
  delay = 0,
  style,
}: FadeSlideInProps) {
  const { reducedMotion } = useMotionPreference();
  const offset = reducedMotion ? 0 : distance * (from === 'top' || from === 'left' ? -1 : 1);
  const horizontal = from === 'left' || from === 'right';

  const opacity = useSharedValue(0);
  const translate = useSharedValue(offset);

  useEffect(() => {
    const safeDelay = Number.isFinite(delay) && delay > 0 ? delay : 0;
    opacity.value = withDelay(safeDelay, withTiming(1, timingConfig(duration, reducedMotion, { easing, kind: 'fade' })));
    translate.value = withDelay(safeDelay, withTiming(0, timingConfig(duration, reducedMotion, { easing })));
    // Entrance runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: horizontal ? [{ translateX: translate.value }] : [{ translateY: translate.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
