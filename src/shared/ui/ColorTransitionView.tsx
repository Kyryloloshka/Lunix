import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { timingConfig, useMotionPreference } from '@shared/lib/motion';
import type { DurationToken } from '@shared/theme';

interface ColorTransitionViewProps {
  children?: ReactNode;
  /** Target background; changes glide instead of jumping (e.g. the rank theme after a promotion). */
  backgroundColor: string;
  /** Target border color. Leave out for a view without a colored border. */
  borderColor?: string;
  /** Default `slow`. Under reduced motion it is capped to the short fade duration. */
  duration?: DurationToken;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * A View whose background and border colors transition on the UI thread when the props change.
 * It only changes colors, so it stays valid under reduced motion (the fade is just shorter).
 * Layout comes from `style`; the wrapper adds none.
 */
export function ColorTransitionView({
  children,
  backgroundColor,
  borderColor,
  duration = 'slow',
  style,
  testID,
}: ColorTransitionViewProps) {
  const { reducedMotion } = useMotionPreference();
  const background = useSharedValue(backgroundColor);
  const border = useSharedValue(borderColor ?? backgroundColor);

  useEffect(() => {
    const config = timingConfig(duration, reducedMotion, { kind: 'fade' });
    background.value = withTiming(backgroundColor, config);
    border.value = withTiming(borderColor ?? backgroundColor, config);
  }, [backgroundColor, borderColor, duration, reducedMotion, background, border]);

  const animatedStyle = useAnimatedStyle(() => (
    borderColor === undefined
      ? { backgroundColor: background.value }
      : { backgroundColor: background.value, borderColor: border.value }
  ));

  return <Animated.View testID={testID} style={[style, animatedStyle]}>{children}</Animated.View>;
}
