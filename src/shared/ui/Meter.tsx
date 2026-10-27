import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, resources } from '@shared/theme';

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
  style?: StyleProp<ViewStyle>;
}

export function clampRatio(ratio: number): number {
  return Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
}

/** Horizontal meter for stress, combo and progress. Memoized: a tick that doesn't move it costs nothing. */
export const Meter = memo(function Meter({ ratio, kind = 'progress', color, height, valueText, style }: MeterProps) {
  const safe = clampRatio(ratio);
  const preset = KINDS[kind];
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
      <View style={[styles.fill, { width: `${safe * 100}%`, backgroundColor: color ?? preset.color }]} />
    </View>
  );
});

const styles = StyleSheet.create({
  track: { width: '100%', borderRadius: radii.full, overflow: 'hidden', backgroundColor: colors.surface.inset },
  fill: { height: '100%', borderRadius: radii.full },
});
