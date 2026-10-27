import { useEffect, useRef } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { timingConfig, useMotionPreference } from '@shared/lib/motion';

/** How far (dp) the new value rolls up from. */
const ROLL_DISTANCE = 8;
const ROLL_START_OPACITY = 0.3;

interface RollTextProps {
  /** The displayed text. When it changes after mount, the new value rolls in from below. */
  text: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  maxFontSizeMultiplier?: number;
}

/**
 * A short text (level counter, small number) that "rolls" up when it changes: the new value slides in
 * from below and fades to full. UI thread only; no animation on first render. Under reduced motion the
 * value just fades in, with no movement.
 */
export function RollText({ text, style, numberOfLines, maxFontSizeMultiplier }: RollTextProps) {
  const { reducedMotion } = useMotionPreference();
  const offset = useSharedValue(0);
  const opacity = useSharedValue(1);
  const previous = useRef(text);

  useEffect(() => {
    if (previous.current === text) return;
    previous.current = text;
    opacity.value = ROLL_START_OPACITY;
    opacity.value = withTiming(1, timingConfig('base', reducedMotion, { kind: 'fade', easing: 'decelerate' }));
    if (!reducedMotion) {
      offset.value = ROLL_DISTANCE;
      offset.value = withTiming(0, timingConfig('base', reducedMotion, { easing: 'emphasized' }));
    }
  }, [text, reducedMotion, offset, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: offset.value }],
  }));

  return (
    <Animated.Text
      style={[style, animatedStyle]}
      numberOfLines={numberOfLines}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
    >
      {text}
    </Animated.Text>
  );
}
