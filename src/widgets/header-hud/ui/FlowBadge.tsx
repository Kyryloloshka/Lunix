import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { RHYTHM_CONFIG } from '@entities/currency';
import { timingConfig, useMotionPreference } from '@shared/lib/motion';
import { DENSE_TEXT_MAX_FONT_SCALE, DevGlyph, Meter } from '@shared/ui';
import { colors, radii, resources, springs, typography } from '@shared/theme';
import { t } from '@shared/i18n';
import { getFlowTimeRatio } from '../model/stressZone';

const POP_FROM_SCALE = 0.55;

interface FlowBadgeProps {
  multiplier: number;
  remainingMs: number;
}

/**
 * The "FLOW ×N · Ns" badge (T-015). It is mounted only while Flow is active, so mounting is the
 * "enter Flow" moment: it pops in with a spring and the thin strip along its bottom edge shows the time
 * left. Under reduced motion it just fades in.
 */
export function FlowBadge({ multiplier, remainingMs }: FlowBadgeProps) {
  const { reducedMotion } = useMotionPreference();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = 0;
    opacity.value = withTiming(1, timingConfig('fast', reducedMotion, { kind: 'fade', easing: 'decelerate' }));
    if (reducedMotion) return;
    scale.value = POP_FROM_SCALE;
    scale.value = withSpring(1, springs.pop);
    // The pop plays when the badge appears, i.e. when Flow starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const popStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.badge, popStyle]} testID="hud-flow-badge">
      <DevGlyph name={resources.flow.glyph} size={12} color={colors.text.onAccent} />
      <Text style={styles.text} numberOfLines={1} maxFontSizeMultiplier={DENSE_TEXT_MAX_FONT_SCALE}>
        {t('status.flow')} x{multiplier} · {Math.ceil(remainingMs / 1000)}s
      </Text>
      <Meter
        animated
        ratio={getFlowTimeRatio(remainingMs, RHYTHM_CONFIG.flow.durationMs)}
        color={colors.text.onAccent}
        height={2}
        style={styles.timer}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: resources.flow.color,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
    gap: 4,
    overflow: 'hidden',
  },
  text: {
    color: colors.text.onAccent,
    fontFamily: typography.mono,
    fontWeight: '900',
    fontSize: typography.sizes.xs,
    letterSpacing: 0.5,
  },
  // Thin remaining-time strip along the bottom edge; the track is invisible so only the fill shows.
  timer: { position: 'absolute', left: 0, bottom: 0, backgroundColor: 'transparent', borderRadius: 0 },
});
