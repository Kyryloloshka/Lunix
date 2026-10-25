import { StyleSheet, Text, View } from 'react-native';
import {
  RHYTHM_CONFIG,
  getStressReductionPercent,
  selectTapStressMultiplier,
  toCountdownSeconds,
  useCurrencyStore,
} from '@entities/currency';
import { DevGlyph } from '@shared/ui';
import { colors, radii, resources, typography } from '@shared/theme';
import { t } from '@shared/i18n';

/** Flow recharge meter: shown after Flow ends while the combo cannot build (T-014). */
export function FlowCooldownMeter() {
  const remainingMs = useCurrencyStore((state) => state.flow.cooldownRemainingMs);
  const seconds = toCountdownSeconds(remainingMs);
  const charged = 1 - Math.min(1, Math.max(0, remainingMs / RHYTHM_CONFIG.flow.cooldownMs));

  return (
    <View
      style={styles.cooldown}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('status.cooldown', { seconds })}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(charged * 100) }}
    >
      <Text style={styles.text}>{t('status.cooldown', { seconds })}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${charged * 100}%` }]} />
      </View>
    </View>
  );
}

/** Total tap-stress reduction (Cognitive resilience × soft skills), so the Cognitive link is visible. */
export function ResilienceTag() {
  const percent = useCurrencyStore((state) => getStressReductionPercent(selectTapStressMultiplier(state)));
  if (percent <= 0) return null;

  return (
    <View
      style={styles.resilience}
      accessible
      accessibilityLabel={t('status.resilienceA11y', { percent })}
    >
      <DevGlyph name={resources.cognitive.glyph} size={10} color={resources.cognitive.color} />
      <Text style={[styles.text, { color: resources.cognitive.color }]}>
        {t('status.resilience', { percent })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cooldown: { alignItems: 'flex-end', gap: 3 },
  text: {
    ...typography.roles.label,
    color: colors.text.muted,
    letterSpacing: 0,
  },
  track: {
    width: 64,
    height: 3,
    backgroundColor: colors.bg.inset,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: resources.flow.color },
  resilience: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
