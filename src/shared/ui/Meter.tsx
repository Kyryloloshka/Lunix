import { memo, useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { timingConfig, useMotionPreference } from '@shared/lib/motion';
import { colors, durations, radii, resources } from '@shared/theme';

export type MeterKind = 'progress' | 'stress' | 'combo';

interface KindStyle {
  color: string;
  height: number;
}

const KINDS: Record<MeterKind, KindStyle> = {
  progress: { color: colors.feedback.success, height: 6 },
  stress: { color: resources.stress.color, height: 4 },
  combo: { color: colors.accent.amber, height: 3 },
};

/** Opacity the pulsing fill dips to; never fully dark so the level stays readable. */
const PULSE_LOW_OPACITY = 0.55;

export interface MeterProps {
  /** Filled share, 0..1. Out-of-range and non-finite values are clamped. */
  ratio: number;
  kind?: MeterKind;
  /** Overrides the kind's color (e.g. a stress meter that turns amber or red). */
  color?: string;
  height?: number;
  /**
   * Text value for screen readers, e.g. "Stress 42%". When set, the meter is exposed as a
   * `progressbar` with a 0..100 value. Without it the bar is decorative: put the number in nearby text.
   */
  valueText?: string;
  /**
   * Glide the fill (and its color) to new values on the UI thread instead of jumping (T-015).
   * Off by default so lists of meters stay cheap; use it for the few HUD meters.
   */
  animated?: boolean;
  /** Animated meters only: breathe the fill's opacity (e.g. stress above the throttling line). Static under reduced motion. */
  pulse?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function clampRatio(ratio: number): number {
  return Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
}

/** Horizontal meter for stress, combo and progress. Memoized: a tick that doesn't move it costs nothing. */
export const Meter = memo(function Meter({
  ratio, kind = 'progress', color, height, valueText, animated = false, pulse = false, style,
}: MeterProps) {
  const safe = clampRatio(ratio);
  const preset = KINDS[kind];
  const fillColor = color ?? preset.color;
  const a11y = valueText
    ? {
        accessible: true,
        accessibilityRole: 'progressbar' as const,
        accessibilityLabel: valueText,
        accessibilityValue: { min: 0, max: 100, now: Math.round(safe * 100) },
      }
    : { accessible: false, importantForAccessibility: 'no-hide-descendants' as const };

  return (
    <View {...a11y} style={[styles.track, { height: height ?? preset.height }, style]}>
      {animated ? (
        <AnimatedFill ratio={safe} color={fillColor} pulse={pulse} />
      ) : (
        <View style={[styles.fill, { width: `${safe * 100}%`, backgroundColor: fillColor }]} />
      )}
    </View>
  );
});

function AnimatedFill({ ratio, color, pulse }: { ratio: number; color: string; pulse: boolean }) {
  const { reducedMotion } = useMotionPreference();
  const progress = useSharedValue(ratio);
  const fillColor = useSharedValue(color);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // A fill that moves is motion; the end state is applied at once under reduced motion.
    progress.value = withTiming(ratio, timingConfig('base', reducedMotion, { easing: 'standard' }));
  }, [ratio, reducedMotion, progress]);

  useEffect(() => {
    fillColor.value = withTiming(color, timingConfig('base', reducedMotion, { kind: 'fade' }));
  }, [color, reducedMotion, fillColor]);

  useEffect(() => {
    if (!pulse || reducedMotion) {
      cancelAnimation(opacity);
      opacity.value = 1;
      return undefined;
    }
    const half = { duration: durations.slow + durations.fast };
    opacity.value = withRepeat(withSequence(withTiming(PULSE_LOW_OPACITY, half), withTiming(1, half)), -1);
    return () => cancelAnimation(opacity);
  }, [pulse, reducedMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
    backgroundColor: fillColor.value,
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.fill, animatedStyle]} />;
}

const styles = StyleSheet.create({
  track: { width: '100%', borderRadius: radii.full, overflow: 'hidden', backgroundColor: colors.surface.inset },
  fill: { height: '100%', borderRadius: radii.full },
});
