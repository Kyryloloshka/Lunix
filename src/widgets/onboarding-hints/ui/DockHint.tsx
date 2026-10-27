import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { TEXT_MAX_FONT_SCALE } from '@shared/ui';
import { colors, radii, spacing, typography } from '@shared/theme';
import { t, useLocale } from '@shared/i18n';
import { useGuideStage } from '../model/useGuideStage';
import { usePulse } from './usePulse';

const TAB_COUNT = 5;
/** Index of the Stack tab in the bottom dock. */
const SKILLS_TAB_INDEX = 1;

interface DockHintProps {
  /** The tab on screen: on the Stack tab the player is already where the hint points. */
  onSkillsTab: boolean;
}

/**
 * Third guided step (T-018): once the first skill is affordable, an arrow over the Stack tab. A normal
 * row between the content and the dock, so it never covers anything. Closes when a skill is bought.
 * The row mirrors the dock's horizontal padding so the arrow lands over the Stack tab on any width.
 */
export function DockHint({ onSkillsTab }: DockHintProps) {
  useLocale();
  const stage = useGuideStage();
  const visible = stage === 'buy' && !onSkillsTab;
  const pulse = usePulse(visible);
  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - pulse.value) * -4 + 4 }] }));
  if (!visible) return null;

  const tab = t('nav.skills');
  const label = t('onboarding.buy.label', { resource: t('resources.cognitive'), tab });
  return (
    <View
      style={styles.root}
      accessible
      accessibilityLabel={t('onboarding.buy.a11y', { tab })}
      accessibilityLiveRegion="polite"
      testID="onboarding-dock-hint"
    >
      <View style={styles.pill}>
        <Text style={styles.text} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>{label}</Text>
      </View>
      <View style={styles.arrowRow}>
        {Array.from({ length: TAB_COUNT }, (_, index) => (
          <View key={index} style={styles.arrowCell}>
            {index === SKILLS_TAB_INDEX ? (
              <Animated.Text style={[styles.arrow, arrowStyle]}>
                {'▼'}
              </Animated.Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    // Same horizontal inset as the dock container plus its inner padding.
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  pill: {
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent.amber,
    backgroundColor: colors.accent.amberBg,
  },
  text: {
    ...typography.roles.label,
    color: colors.accent.amberBright,
    textAlign: 'center',
  },
  arrowRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xs,
  },
  arrowCell: {
    flex: 1,
    alignItems: 'center',
  },
  arrow: {
    color: colors.accent.amberBright,
    fontSize: typography.sizes.md,
    lineHeight: 20,
  },
});
