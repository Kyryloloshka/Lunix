import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { t, useLocale, type Locale } from '@shared/i18n';
import { colors, radii, spacing, typography } from '@shared/theme';
import { Panel } from '@shared/ui';
import { useSettingsStore } from '@features/settings';

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
        <Text style={styles.switchText}>{value ? 'ON' : 'OFF'}</Text>
      </View>
    </Pressable>
  );
}

export function SettingsPanel() {
  const locale = useLocale();
  const load = useSettingsStore((state) => state.load);
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const hapticsEnabled = useSettingsStore((state) => state.hapticsEnabled);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const setSoundEnabled = useSettingsStore((state) => state.setSoundEnabled);
  const setHapticsEnabled = useSettingsStore((state) => state.setHapticsEnabled);
  const setReducedMotion = useSettingsStore((state) => state.setReducedMotion);
  const setLocale = useSettingsStore((state) => state.setLocale);
  const notation = useSettingsStore((state) => state.notation);
  const setNotation = useSettingsStore((state) => state.setNotation);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Panel tone="subtle" style={styles.container}>
      <Text style={styles.heading}>{t('settings.heading')}</Text>
      <Text style={styles.subtitle}>{t('settings.subheading')}</Text>
      <ToggleRow label={t('settings.sound')} value={soundEnabled} onChange={setSoundEnabled} />
      <ToggleRow label={t('settings.haptics')} value={hapticsEnabled} onChange={setHapticsEnabled} />
      <ToggleRow label={t('settings.reducedMotion')} value={reducedMotion} onChange={setReducedMotion} />
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
  selectLabel: { color: colors.text.muted, fontFamily: typography.mono, fontSize: typography.sizes.xxs, fontWeight: '900', marginTop: spacing.md, marginBottom: 5 },
  selectRow: { flexDirection: 'row', gap: 6 },
  selectOption: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.inset },
  selectOptionActive: { borderColor: colors.accent.phosphorDim, backgroundColor: colors.accent.phosphorBg },
  selectText: { color: colors.text.muted, fontFamily: typography.mono, fontSize: typography.sizes.xs, fontWeight: '900' },
  selectTextActive: { color: colors.accent.phosphorBright },
});
