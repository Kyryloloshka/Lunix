import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { getNewlyUnlockedResources, getRankVisibility } from '@entities/career-rank';
import { useSettingsStore } from '@features/settings';
import { useMotionPreference } from '@shared/lib/motion';
import { FadeSlideIn, MIN_TOUCH_TARGET, TEXT_MAX_FONT_SCALE } from '@shared/ui';
import { colors, durations, getRankTheme, radii, resources, spacing, springs, typography } from '@shared/theme';
import { t } from '@shared/i18n';

/** How long the celebration stays before closing itself: the celebrate beat plus a slow exit window. */
const AUTO_DISMISS_MS = durations.celebrate + durations.slow * 1.5;
const POP_FROM_SCALE = 0.85;

interface PromotionCelebrationProps {
  /** The rank the player was just promoted to; null hides the card. */
  rankId: number | null;
  onDismiss: () => void;
}

/**
 * Full-screen promotion moment (T-008): new title, what opened up, the new next goal.
 * Reduced motion: a static card that stays until dismissed (no pop, no auto-close).
 */
export function PromotionCelebration({ rankId, onDismiss }: PromotionCelebrationProps) {
  const { reducedMotion } = useMotionPreference();
  const hapticsEnabled = useSettingsStore((state) => state.hapticsEnabled);
  const scale = useSharedValue(1);
  const visible = rankId !== null;

  useEffect(() => {
    if (!visible) return undefined;
    if (hapticsEnabled) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
    }
    if (reducedMotion) {
      scale.value = 1;
      return undefined;
    }
    scale.value = POP_FROM_SCALE;
    scale.value = withSpring(1, springs.pop);
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
    // Runs once per promotion; settings changes mid-celebration must not replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankId]);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (rankId === null) return null;

  const rankTheme = getRankTheme(rankId);
  const title = t(`career.ranks.${rankId}.title`);
  const unlocked = getNewlyUnlockedResources(rankId - 1, rankId);
  const nextRankId = rankId + 1;
  const hasNext = getRankVisibility(nextRankId, rankId) === 'next';

  return (
    <Modal transparent visible animationType="none" onRequestClose={onDismiss} statusBarTranslucent>
      <Pressable
        style={styles.root}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel={t('career.celebrateA11y', { rank: title })}
      >
        <View style={styles.scrim} />
        <FadeSlideIn duration="slow" style={styles.cardWrap}>
          <Animated.View
            style={[styles.card, { borderColor: rankTheme.accent }, popStyle]}
            accessibilityLiveRegion="assertive"
          >
            <Text style={[styles.eyebrow, { color: rankTheme.accentBright }]} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>
              {t('career.celebrateEyebrow')}
            </Text>
            <Text style={styles.title} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>
              {t('career.celebrateTitle', { rank: title })}
            </Text>
            <Text style={styles.desc} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>
              {t(`career.ranks.${rankId}.desc`)}
            </Text>
            {unlocked.map((resource) => (
              <Text
                key={resource}
                style={[styles.unlock, { color: resources[resource].color }]}
                maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}
              >
                + {t('career.celebrateUnlocked', { resource: t(resources[resource].labelKey) })}
              </Text>
            ))}
            {hasNext ? (
              <Text style={styles.next} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>
                {t('career.celebrateNextGoal', { rank: t(`career.ranks.${nextRankId}.title`) })}
              </Text>
            ) : null}
            <View style={[styles.continue, { borderColor: rankTheme.accent }]}>
              <Text style={[styles.continueText, { color: rankTheme.accentBright }]} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>
                {t('career.celebrateContinue')}
              </Text>
            </View>
          </Animated.View>
        </FadeSlideIn>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.surface.inset,
    opacity: 0.88,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 360,
  },
  card: {
    backgroundColor: colors.surface.raised,
    borderWidth: 2,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  eyebrow: {
    ...typography.roles.label,
  },
  title: {
    ...typography.roles.title,
    color: colors.text.primary,
    textAlign: 'center',
  },
  desc: {
    ...typography.roles.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  unlock: {
    ...typography.roles.label,
    textAlign: 'center',
  },
  next: {
    ...typography.roles.label,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  continue: {
    marginTop: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
    minWidth: 160,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  continueText: {
    ...typography.roles.label,
  },
});
