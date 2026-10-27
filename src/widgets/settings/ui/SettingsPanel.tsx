import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CAREER_RANKS } from '@entities/career-rank';
import { t, useLocale, type Locale } from '@shared/i18n';
import { useMotionPreference } from '@shared/lib/motion';
import { colors, radii, spacing, typography } from '@shared/theme';
import { Button, MIN_TOUCH_TARGET, Panel, SegmentedControl, Toggle, type SegmentOption } from '@shared/ui';
import { useSettingsStore, type NumberNotation } from '@features/settings';
import { useSkillStore } from '@features/purchase-skill';
import { useOnboardingStore } from '@features/onboarding';

const LOCALES: readonly Locale[] = ['uk', 'en', 'es'];

/** Visible label is the language code; the spoken name is the language's own name (same in every locale). */
function localeOptions(): SegmentOption<Locale>[] {
  return LOCALES.map((code) => ({
    value: code,
    label: code.toUpperCase(),
    accessibilityLabel: t(`settings.languageNames.${code}`),
  }));
}

type ResetProgressSectionProps = {
  onResetProgress: () => Promise<void>;
};

/** Two-step "start over": the second step names the rank the player is about to lose. */
function ResetProgressSection({ onResetProgress }: ResetProgressSectionProps) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const storedRank = useSkillStore((state) => state.currentRank);
  const rank = CAREER_RANKS[Math.min(Math.max(0, storedRank), CAREER_RANKS.length - 1)];

  const confirm = () => {
    if (busy) return;
    setBusy(true);
    void onResetProgress().finally(() => {
      setBusy(false);
      setConfirming(false);
    });
  };

  return (
    <View style={styles.resetSection}>
      <Text style={styles.selectLabel}>{t('settings.resetHeading')}</Text>
      {confirming ? (
        <View accessibilityLiveRegion="polite" style={styles.resetConfirm}>
          <Text style={styles.resetWarning}>
            {t('settings.resetConfirmText', { rank: t(`career.ranks.${rank.id}.title`) })}
          </Text>
          <View style={styles.resetActions}>
            <Button tone="secondary" size="sm" style={styles.resetAction} onPress={() => setConfirming(false)}>
              {t('settings.resetCancel')}
            </Button>
            <Button tone="danger" size="sm" style={styles.resetAction} loading={busy} onPress={confirm}>
              {t('settings.resetConfirm')}
            </Button>
          </View>
        </View>
      ) : (
        <>
          <Text style={styles.resetHint}>{t('settings.resetHint')}</Text>
          <Button tone="secondary" size="sm" fullWidth onPress={() => setConfirming(true)}>
            {t('settings.resetStart')}
          </Button>
        </>
      )}
    </View>
  );
}

type SettingsPanelProps = {
  /** Provided by the app layer, which owns the save. */
  onResetProgress: () => Promise<void>;
};

export function SettingsPanel({ onResetProgress }: SettingsPanelProps) {
  const locale = useLocale();
  // Settings are loaded once by the app layer. Do not call `load()` here: opening the tab must never
  // revert a value the player just changed.
  const hapticsEnabled = useSettingsStore((state) => state.hapticsEnabled);
  const reducedMotionChoice = useSettingsStore((state) => state.reducedMotionChoice);
  const setHapticsEnabled = useSettingsStore((state) => state.setHapticsEnabled);
  const setReducedMotionChoice = useSettingsStore((state) => state.setReducedMotionChoice);
  const setLocale = useSettingsStore((state) => state.setLocale);
  const replayIntro = useOnboardingStore((state) => state.replayIntro);
  const notation = useSettingsStore((state) => state.notation);
  const setNotation = useSettingsStore((state) => state.setNotation);
  const notationOptions: readonly SegmentOption<NumberNotation>[] = [
    { value: 'compact', label: t('settings.compact') },
    { value: 'scientific', label: t('settings.scientific') },
  ];
  // Effective value: the player's explicit choice, or the OS setting while they haven't chosen.
  const { reducedMotion } = useMotionPreference();

  return (
    <Panel tone="subtle" style={styles.container}>
      <Text style={styles.heading}>{t('settings.heading')}</Text>
      <Text style={styles.subtitle}>{t('settings.subheading')}</Text>
      <Toggle label={t('settings.haptics')} value={hapticsEnabled} onChange={setHapticsEnabled} onText={t('settings.on')} offText={t('settings.off')} />
      <Toggle label={t('settings.reducedMotion')} value={reducedMotion} onChange={setReducedMotionChoice} onText={t('settings.on')} offText={t('settings.off')} />
      {reducedMotionChoice === null ? (
        <Text style={styles.hint}>{t('settings.reducedMotionSystem')}</Text>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => setReducedMotionChoice(null)}
          hitSlop={8}
          style={styles.hintButton}
        >
          <Text style={[styles.hint, styles.hintLink]}>{t('settings.reducedMotionUseSystem')}</Text>
        </Pressable>
      )}
      <Text style={styles.selectLabel}>{t('settings.language')}</Text>
      <SegmentedControl role="radio" options={localeOptions()} value={locale} onChange={setLocale} />
      <Text style={styles.selectLabel}>{t('settings.notation')}</Text>
      <SegmentedControl role="radio" options={notationOptions} value={notation} onChange={setNotation} />
      <View style={styles.introSection}>
        <Text style={styles.resetHint}>{t('settings.replayIntroHint')}</Text>
        <Button tone="secondary" size="sm" fullWidth onPress={replayIntro}>
          {t('settings.replayIntro')}
        </Button>
      </View>
      <ResetProgressSection onResetProgress={onResetProgress} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: spacing.lg, marginVertical: spacing.md, backgroundColor: colors.surface.raised },
  heading: { color: colors.text.primary, fontFamily: typography.mono, fontSize: typography.sizes.md, fontWeight: '900' },
  subtitle: { color: colors.text.secondary, fontSize: typography.sizes.xs, marginTop: 3, marginBottom: spacing.md },
  hint: { color: colors.text.muted, fontSize: typography.sizes.xs, marginBottom: spacing.xs },
  hintButton: { alignSelf: 'flex-start', minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' },
  hintLink: { color: colors.accent.cyanBright, textDecorationLine: 'underline', marginBottom: 0 },
  selectLabel: { color: colors.text.muted, fontFamily: typography.mono, fontSize: typography.sizes.xs, fontWeight: '900', marginTop: spacing.md, marginBottom: 5 },
  introSection: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border.subtle, paddingTop: spacing.sm },
  resetSection: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border.subtle },
  resetHint: { color: colors.text.secondary, fontSize: typography.sizes.xs, marginBottom: spacing.sm },
  resetConfirm: { gap: spacing.sm, padding: spacing.sm, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.feedback.danger, backgroundColor: colors.feedback.dangerBg },
  resetWarning: { color: colors.text.primary, fontSize: typography.sizes.xs, fontWeight: '700' },
  resetActions: { flexDirection: 'row', gap: spacing.sm },
  resetAction: { flex: 1 },
});
