import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { SkillResource } from '@entities/skill';
import { useSkillStore } from '@features/purchase-skill';
import { useSettingsStore } from '@features/settings';
import { DevGlyph, FadeSlideIn, MIN_TOUCH_TARGET, TEXT_MAX_FONT_SCALE } from '@shared/ui';
import { colors, radii, resources, spacing, typography } from '@shared/theme';
import { t, useLocale } from '@shared/i18n';
import { getResourceUnlockCopy } from '../model/unlockCopy';

const CARD_MAX_WIDTH = 360;
const HERO_GLYPH_SIZE = 28;
const HERO_SIZE = 56;

interface ResourceUnlockCardProps {
  /** The resource that just opened (the first pending unlock event). */
  resource: SkillResource;
  /** Called after the event was acknowledged in the store; the modal host closes the queue entry. */
  onDismiss: () => void;
}

/**
 * "New: Capital — your first salary" (T-016 stage 5): shown once per unlocked resource, scheduled by the
 * shared modal queue from the store's `pendingResourceUnlocks` events. Explains where the resource comes
 * from and what it is for. Stays until the player dismisses it (no auto-close: it is the explanation).
 */
export function ResourceUnlockCard({ resource, onDismiss }: ResourceUnlockCardProps) {
  useLocale();
  const acknowledge = useSkillStore((state) => state.acknowledgeResourceUnlock);
  const hapticsEnabled = useSettingsStore((state) => state.hapticsEnabled);

  useEffect(() => {
    if (!hapticsEnabled) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    // One buzz per card; a settings change while it is open must not replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource]);

  const token = resources[resource];
  const copy = getResourceUnlockCopy(resource);
  const name = t(token.labelKey);
  const dismiss = () => {
    acknowledge();
    onDismiss();
  };

  return (
    <Modal transparent visible animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <View style={styles.root}>
        <View style={styles.scrim} />
        {/* key: each queued resource gets its own entrance */}
        <FadeSlideIn key={resource} duration="slow" style={styles.cardWrap}>
          <View style={[styles.card, { borderColor: token.color }]} accessibilityLiveRegion="assertive">
            <View style={[styles.hero, { backgroundColor: token.bg, borderColor: token.color }]}>
              <DevGlyph name={token.glyph} size={HERO_GLYPH_SIZE} color={token.color} />
            </View>
            <Text style={[styles.eyebrow, { color: token.color }]} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>
              {t('resourceUnlock.eyebrow')}
            </Text>
            <Text accessibilityRole="header" style={styles.title} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>
              {t(copy.titleKey)}
            </Text>

            <View style={styles.section}>
              <Text style={styles.sectionLabel} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>
                {t('resourceUnlock.sourceLabel')}
              </Text>
              <Text style={styles.body} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>{t(copy.sourceKey)}</Text>
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionLabel} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>
                {t('resourceUnlock.useLabel')}
              </Text>
              <Text style={styles.body} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>{t(copy.useKey)}</Text>
            </View>
            <Text style={styles.hint} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>
              {t('resourceUnlock.modeHint', { mode: t(copy.modeKey) })}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('resourceUnlock.a11y', { resource: name })}
              onPress={dismiss}
              style={({ pressed }) => [
                styles.continue,
                { borderColor: token.color },
                pressed && { backgroundColor: token.bg },
              ]}
            >
              <Text style={[styles.continueText, { color: token.color }]} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>
                {t('resourceUnlock.continue')}
              </Text>
            </Pressable>
          </View>
        </FadeSlideIn>
      </View>
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
    maxWidth: CARD_MAX_WIDTH,
  },
  card: {
    backgroundColor: colors.surface.raised,
    borderWidth: 2,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  hero: {
    width: HERO_SIZE,
    height: HERO_SIZE,
    borderRadius: radii.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    ...typography.roles.label,
    marginTop: spacing.xs,
  },
  title: {
    ...typography.roles.title,
    color: colors.text.primary,
    textAlign: 'center',
  },
  section: {
    width: '100%',
    gap: spacing.xxs,
    padding: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.surface.inset,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  sectionLabel: {
    ...typography.roles.label,
    color: colors.text.muted,
  },
  body: {
    ...typography.roles.body,
    color: colors.text.secondary,
  },
  hint: {
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
