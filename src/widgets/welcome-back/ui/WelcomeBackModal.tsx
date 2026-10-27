import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '@features/settings';
import { Decimal } from '@shared/lib/decimal';
import { formatCurrency, formatDecimal } from '@shared/lib/formatters';
import { useMotionPreference } from '@shared/lib/motion';
import { Button, CountUpText, DevGlyph, FadeSlideIn, TEXT_MAX_FONT_SCALE, glyphSymbols } from '@shared/ui';
import { colors, radii, resources, spacing, typography } from '@shared/theme';
import { t, useLocale } from '@shared/i18n';
import { getReportLine, getReportedResources, splitDuration, type OfflineReport, type ReportResource } from '../model/offlineReport';

const CARD_MAX_WIDTH = 360;
const COUNT_UP_STEPS = 12;

const formatReported = (resource: ReportResource) => (value: Decimal): string => {
  const meta = resources[resource];
  return resource === 'capital'
    ? `+${formatCurrency(value)}`
    : `+${formatDecimal(value)} ${glyphSymbols[meta.glyph]}`;
};

interface WelcomeBackModalProps {
  report: OfflineReport;
  onDismiss: () => void;
}

function formatAway(seconds: number): string {
  const { hours, minutes } = splitDuration(seconds);
  return hours > 0 ? t('welcomeBack.durationHm', { hours, minutes }) : t('welcomeBack.durationM', { minutes });
}

/** One resource row; the number counts up from zero (instantly under reduced motion). */
function EarnedRow({ resource, amount }: { resource: ReportResource; amount: Decimal }) {
  const { reducedMotion } = useMotionPreference();
  const [shown, setShown] = useState<Decimal>(reducedMotion ? amount : Decimal.ZERO);
  const meta = resources[resource];
  const label = t(meta.labelKey);
  const format = formatReported(resource);

  useEffect(() => {
    setShown(amount);
  }, [amount]);

  return (
    <View style={styles.row}>
      <View style={styles.rowLabel}>
        <DevGlyph name={meta.glyph} size={14} color={meta.color} />
        <Text style={[styles.rowName, { color: meta.color }]} numberOfLines={1} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>
          {label}
        </Text>
      </View>
      <CountUpText
        value={shown}
        format={format}
        duration="celebrate"
        steps={COUNT_UP_STEPS}
        style={[styles.rowValue, { color: meta.color }]}
        accessibilityLabel={`${format(amount)} ${label}`}
        maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}
        testID={`welcome-back-${resource}`}
      />
    </View>
  );
}

/**
 * "While you were away" (T-019): how long the player was gone, what it earned per resource and a
 * joke line for their career phase. The grant is already in the balance; "Collect" only closes it.
 */
export function WelcomeBackModal({ report, onDismiss }: WelcomeBackModalProps) {
  useLocale();
  const hapticsEnabled = useSettingsStore((state) => state.hapticsEnabled);
  const line = getReportLine(report);
  const earned = getReportedResources(report);
  const away = formatAway(report.seconds);

  useEffect(() => {
    if (!hapticsEnabled) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    // One buzz per screen; a settings change while it is open must not replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal transparent visible animationType="none" onRequestClose={onDismiss} statusBarTranslucent>
      <View style={styles.root}>
        <View style={styles.scrim} />
        <FadeSlideIn duration="slow" style={styles.cardWrap}>
          <View style={styles.card} accessibilityLiveRegion="assertive">
            <Text style={styles.eyebrow} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>
              {t('welcomeBack.eyebrow')}
            </Text>
            <Text accessibilityRole="header" style={styles.title} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>
              {t('welcomeBack.title', { duration: away })}
            </Text>
            <Text style={styles.line} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>
              {t(line.key, { count: line.count })}
            </Text>

            <View style={styles.rows}>
              {earned.map((resource) => (
                <EarnedRow key={resource} resource={resource} amount={report.earned[resource]} />
              ))}
            </View>

            {report.capped ? (
              <Text style={styles.capped} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>
                {t('welcomeBack.capped')}
              </Text>
            ) : null}

            <Button tone="primary" style={styles.collect} onPress={onDismiss} accessibilityLabel={t('welcomeBack.collectA11y')}>
              {t('welcomeBack.collect')}
            </Button>
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
    borderColor: colors.border.active,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  eyebrow: {
    ...typography.roles.label,
    color: colors.text.muted,
  },
  title: {
    ...typography.roles.title,
    color: colors.text.primary,
    textAlign: 'center',
  },
  line: {
    ...typography.roles.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  rows: {
    width: '100%',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.surface.inset,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  rowName: {
    ...typography.roles.label,
  },
  rowValue: {
    ...typography.roles.body,
    fontFamily: typography.mono,
    fontWeight: '900',
    textAlign: 'right',
  },
  capped: {
    ...typography.roles.label,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  collect: {
    marginTop: spacing.sm,
    minWidth: 160,
  },
});
