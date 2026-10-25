import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useOnboardingStore } from '@features/onboarding';
import { MIN_TOUCH_TARGET, TEXT_MAX_FONT_SCALE } from '@shared/ui';
import { colors, radii, resources, spacing, typography } from '@shared/theme';
import { t, useLocale } from '@shared/i18n';

/**
 * Stress explanation at ~30% (T-018), a card over the tap zone. The layer ignores touches, only the
 * "Got it" button catches one, so tapping on keeps earning. It also closes by itself once the player
 * rests and the meter falls, which is the lesson. Goes into the Console's `overlay` slot.
 */
export function StressHint() {
  useLocale();
  const open = useOnboardingStore((state) => state.stressHintOpen);
  const dismiss = useOnboardingStore((state) => state.dismissStressHint);
  if (!open) return null;

  const token = resources.stress;
  return (
    <View pointerEvents="box-none" style={styles.root}>
      <View style={[styles.card, { borderColor: token.color }]} accessibilityLiveRegion="polite" testID="onboarding-stress-hint">
        <Text accessibilityRole="header" style={[styles.title, { color: token.color }]} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>
          {t('onboarding.stress.title')}
        </Text>
        <Text style={styles.body} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>{t('onboarding.stress.body')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.stress.dismissA11y')}
          onPress={dismiss}
          hitSlop={4}
          style={({ pressed }) => [styles.dismiss, { borderColor: token.color }, pressed && { backgroundColor: token.bg }]}
        >
          <Text style={[styles.dismissText, { color: token.color }]} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>
            {t('onboarding.stress.dismiss')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  card: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    backgroundColor: colors.surface.raised,
  },
  title: {
    ...typography.roles.label,
  },
  body: {
    ...typography.roles.body,
    color: colors.text.secondary,
  },
  dismiss: {
    alignSelf: 'flex-end',
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  dismissText: {
    ...typography.roles.label,
  },
});
