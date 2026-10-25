import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CAREER_RANKS } from '@entities/career-rank';
import { t, useLocale, type Locale } from '@shared/i18n';
import { useMotionPreference } from '@shared/lib/motion';
import { colors, radii, spacing, typography } from '@shared/theme';
import { GameButton, Panel } from '@shared/ui';
import { useSettingsStore } from '@features/settings';
import { useSkillStore } from '@features/purchase-skill';

type ToggleRowProps = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

function ToggleRow({ label, value, onChange }: ToggleRowProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={styles.row}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.switch, value && styles.switchActive]}>
        <Text style={[styles.switchText, value && styles.switchTextActive]}>
          {value ? t('settings.on') : t('settings.off')}
        </Text>
      </View>
    </Pressable>
  );
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
            <GameButton tone="secondary" size="sm" style={styles.resetAction} onPress={() => setConfirming(false)}>
              {t('settings.resetCancel')}
            </GameButton>
            <GameButton
              tone="warning"
              size="sm"
              style={styles.resetAction}
              disabled={busy}
              accessibilityState={{ disabled: busy, busy }}
              onPress={confirm}
            >
              {t('settings.resetConfirm')}
            </GameButton>
          </View>
        </View>
      ) : (
        <>
          <Text style={styles.resetHint}>{t('settings.resetHint')}</Text>
          <GameButton tone="secondary" size="sm" fullWidth onPress={() => setConfirming(true)}>
            {t('settings.resetStart')}
          </GameButton>
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
  const notation = useSettingsStore((state) => state.notation);
  const setNotation = useSettingsStore((state) => state.setNotation);
  // Effective value: the player's explicit choice, or the OS setting while they haven't chosen.
  const { reducedMotion } = useMotionPreference();

  return (
    <Panel tone="subtle" style={styles.container}>
      <Text style={styles.heading}>{t('settings.heading')}</Text>
      <Text style={styles.subtitle}>{t('settings.subheading')}</Text>
      <ToggleRow label={t('settings.haptics')} value={hapticsEnabled} onChange={setHapticsEnabled} />
      <ToggleRow label={t('settings.reducedMotion')} value={reducedMotion} onChange={setReducedMotionChoice} />
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
      <View style={styles.selectRow}>
        {(['uk', 'en', 'es'] as Locale[]).map((option) => (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ selected: locale === option }}
            onPress={() => setLocale(option)}
            style={[styles.selectOption, locale === option && styles.selectOptionActive]}
          >
            <Text style={[styles.selectText, locale === option && styles.selectTextActive]}>
              {option.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.selectLabel}>{t('settings.notation')}</Text>
      <View style={styles.selectRow}>
        {(['compact', 'scientific'] as const).map((option) => (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ selected: notation === option }}
            onPress={() => setNotation(option)}
            style={[styles.selectOption, notation === option && styles.selectOptionActive]}
          >
            <Text style={[styles.selectText, notation === option && styles.selectTextActive]}>
              {t(`settings.${option}`)}
            </Text>
          </Pressable>
        ))}
      </View>
      <ResetProgressSection onResetProgress={onResetProgress} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: spacing.lg, marginVertical: spacing.md, backgroundColor: colors.bg.surface },
  heading: { color: colors.text.primary, fontFamily: typography.mono, fontSize: typography.sizes.md, fontWeight: '900' },
  subtitle: { color: colors.text.secondary, fontSize: typography.sizes.xs, marginTop: 3, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, borderTopWidth: 1, borderTopColor: colors.border.subtle },
  label: { color: colors.text.primary, fontSize: typography.sizes.sm, fontWeight: '700' },
  switch: { minWidth: 48, paddingVertical: 5, alignItems: 'center', borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.inset },
  switchActive: { borderColor: colors.accent.phosphorDim, backgroundColor: colors.accent.phosphorBg },
  switchText: { color: colors.text.muted, fontFamily: typography.mono, fontSize: typography.sizes.xxs, fontWeight: '900' },
  switchTextActive: { color: colors.accent.phosphorBright },
  hint: { color: colors.text.muted, fontSize: typography.sizes.xs, marginBottom: spacing.xs },
  hintButton: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' },
  hintLink: { color: colors.accent.cyanBright, textDecorationLine: 'underline', marginBottom: 0 },
  selectLabel: { color: colors.text.muted, fontFamily: typography.mono, fontSize: typography.sizes.xxs, fontWeight: '900', marginTop: spacing.md, marginBottom: 5 },
  selectRow: { flexDirection: 'row', gap: 6 },
  selectOption: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.inset },
  selectOptionActive: { borderColor: colors.accent.phosphorDim, backgroundColor: colors.accent.phosphorBg },
  selectText: { color: colors.text.muted, fontFamily: typography.mono, fontSize: typography.sizes.xs, fontWeight: '900' },
  selectTextActive: { color: colors.accent.phosphorBright },
  resetSection: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border.subtle },
  resetHint: { color: colors.text.secondary, fontSize: typography.sizes.xs, marginBottom: spacing.sm },
  resetConfirm: { gap: spacing.sm, padding: spacing.sm, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.feedback.danger, backgroundColor: colors.feedback.dangerBg },
  resetWarning: { color: colors.text.primary, fontSize: typography.sizes.xs, fontWeight: '700' },
  resetActions: { flexDirection: 'row', gap: spacing.sm },
  resetAction: { flex: 1 },
});
