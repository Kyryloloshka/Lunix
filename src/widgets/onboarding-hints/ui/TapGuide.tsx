import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useCurrencyStore } from '@entities/currency';
import { getFirstSkillCost } from '@features/onboarding';
import { formatDecimal } from '@shared/lib/formatters';
import { TEXT_MAX_FONT_SCALE } from '@shared/ui';
import { colors, radii, spacing, typography } from '@shared/theme';
import { t, useLocale } from '@shared/i18n';
import { useGuideStage } from '../model/useGuideStage';
import { usePulse } from './usePulse';

const TAP_ZONE_FOOTER_CLEARANCE = 96;

function WarmupLabel() {
  const cognitive = useCurrencyStore((state) => state.cognitive);
  const cost = getFirstSkillCost();
  const params = {
    have: formatDecimal(cognitive.lt(cost) ? cognitive : cost),
    cost: formatDecimal(cost),
    resource: t('resources.cognitive'),
  };
  return (
    <View style={styles.pill} accessible accessibilityLabel={t('onboarding.warmup.a11y', params)}>
      <Text style={styles.pillText} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>
        {t('onboarding.warmup.label', params)}
      </Text>
    </View>
  );
}

/**
 * First two guided steps, drawn over the real tap zone (T-018): a pulsing frame and "Tap to study"
 * until the first Cognitive, then a progress line toward the first skill. Never catches touches, so
 * the tap that closes the step is an ordinary tap. Goes into the Console's `overlay` slot.
 */
export function TapGuide() {
  useLocale();
  const stage = useGuideStage();
  const pulse = usePulse(stage === 'tap');
  const frameStyle = useAnimatedStyle(() => ({ opacity: 0.35 + pulse.value * 0.65 }));
  if (stage !== 'tap' && stage !== 'warmup') return null;

  return (
    <View pointerEvents="none" style={styles.root} testID="onboarding-tap-guide">
      {stage === 'tap' ? (
        <>
          <Animated.View style={[styles.frame, frameStyle]} />
          <View style={styles.pill} accessible accessibilityLabel={t('onboarding.tap.a11y')}>
            <Text style={styles.pillText} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>
              {t('onboarding.tap.label')}
            </Text>
          </View>
        </>
      ) : (
        <WarmupLabel />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: spacing.lg,
    // Clears the editor's prompt and hint lines at the bottom of the zone.
    paddingBottom: TAP_ZONE_FOOTER_CLEARANCE,
  },
  frame: {
    ...StyleSheet.absoluteFill,
    margin: spacing.sm,
    borderWidth: 2,
    borderRadius: radii.lg,
    borderColor: colors.accent.phosphorBright,
  },
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent.phosphorBright,
    backgroundColor: colors.surface.raised,
    marginBottom: spacing.sm,
  },
  pillText: {
    ...typography.roles.label,
    color: colors.accent.phosphorBright,
    textAlign: 'center',
  },
});
