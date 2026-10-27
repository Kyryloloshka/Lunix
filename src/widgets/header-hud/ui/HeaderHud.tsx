import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { getUnlockedResources, type RankResource } from '@entities/career-rank';
import type { Decimal } from '@shared/lib/decimal';
import {
  COMBO_WINDOW_MS,
  FLOW_COMBO_THRESHOLD,
  getStressPenaltyPercent,
  toCountdownSeconds,
  useCurrencyStore,
} from '@entities/currency';
import { FlowBadge } from './FlowBadge';
import { FlowCooldownMeter, ResilienceTag } from './RhythmIndicators';
import { useStressZoneFeedback } from './useStressZoneFeedback';
import { formatCurrency, formatDecimal } from '@shared/lib/formatters';
import { ColorTransitionView, CountUpText, DENSE_TEXT_MAX_FONT_SCALE, DevGlyph, FadeSlideIn, Meter } from '@shared/ui';
import { colors, getRankTheme, radii, resources, spacing, typography } from '@shared/theme';
import { t, useLocale } from '@shared/i18n';

// HUD numbers sit in a fixed 3-column grid: cap system font scaling so large fonts don't break it
const HUD_FONT_SCALE = DENSE_TEXT_MAX_FONT_SCALE;
/** Count-up of the balances: fewer pre-formatted frames than the default, since it restarts on every 200 ms tick. */
const COUNT_UP_STEPS = 6;

const HUD_FORMAT: Record<RankResource, (value: Decimal) => string> = {
  capital: (value) => formatCurrency(value),
  cognitive: (value) => formatDecimal(value),
  influence: (value) => formatDecimal(value),
};

interface HeaderHudProps {
  rankTitle: string;
  rankIndex: number;
}

export function HeaderHud({ rankTitle, rankIndex }: HeaderHudProps) {
  useLocale();
  const capital = useCurrencyStore((state) => state.capital);
  const cognitive = useCurrencyStore((state) => state.cognitive);
  const influence = useCurrencyStore((state) => state.influence);
  const stress = useCurrencyStore((state) => state.stress);
  const flow = useCurrencyStore((state) => state.flow);
  const rates = useCurrencyStore((state) => state.rates);
  const income = useCurrencyStore((state) => state.income);

  const shownOnMount = useRef(new Set(getUnlockedResources(rankIndex)));
  const balances: Record<RankResource, Decimal> = { capital, cognitive, influence };
  const perSec: Record<RankResource, Decimal> = {
    capital: rates.capitalPerSec,
    cognitive: rates.cognitivePerSec,
    influence: rates.influencePerSec,
  };

  const rankTheme = getRankTheme(rankIndex);
  const { inZone: stressInZone, shakeStyle: stressShake } = useStressZoneFeedback(stress);
  const stressColor = stress > 75
    ? colors.accent.red
    : stress > 45
    ? colors.accent.amber
    : rankTheme.accent;

  return (
    <ColorTransitionView style={styles.container} borderColor={rankTheme.border} backgroundColor={rankTheme.surfaceTint}>
      <View style={styles.topRow}>
        <View style={styles.rankBadge}>
          <DevGlyph name="rank" size={12} color={rankTheme.accentBright} />
          <Text style={styles.rankText} numberOfLines={1} maxFontSizeMultiplier={HUD_FONT_SCALE}>
            {rankTitle}
          </Text>
        </View>

        <View style={styles.topRowActions}>
          {flow.isActive ? (
            <FlowBadge multiplier={flow.multiplier} remainingMs={flow.remainingMs} />
          ) : flow.cooldownRemainingMs > 0 ? (
            <FlowCooldownMeter />
          ) : (
            <View style={styles.comboProgress}>
              <Text style={styles.comboText} numberOfLines={1} maxFontSizeMultiplier={HUD_FONT_SCALE}>
                {t('status.combo', {
                  current: flow.comboCount,
                  target: FLOW_COMBO_THRESHOLD,
                  seconds: toCountdownSeconds(flow.comboCount > 0 ? flow.comboRemainingMs : COMBO_WINDOW_MS),
                })}
              </Text>
              <Meter animated kind="combo" ratio={flow.comboCount / FLOW_COMBO_THRESHOLD} style={styles.comboMeter} />
            </View>
          )}
        </View>
      </View>

      {/* Progressive reveal (T-016 stage 5): a resource has no box until its rank unlocks it. */}
      <View style={styles.resourcesGrid}>
        {getUnlockedResources(rankIndex).map((resource) => {
          const box = (
            <View style={styles.statBox}>
              <View style={styles.statHeader}>
                <DevGlyph name={resources[resource].glyph} size={11} color={resources[resource].color} />
                <Text style={[styles.label, { color: resources[resource].color }]} numberOfLines={1} maxFontSizeMultiplier={HUD_FONT_SCALE}>
                  {t(resources[resource].labelKey).toUpperCase()}
                </Text>
              </View>
              {/* Counts up on the UI thread: a new balance never re-renders React per frame (T-015). */}
              <CountUpText
                value={balances[resource]}
                format={HUD_FORMAT[resource]}
                duration="fast"
                steps={COUNT_UP_STEPS}
                style={styles.value}
                maxFontSizeMultiplier={HUD_FONT_SCALE}
                testID={`hud-value-${resource}`}
              />
              {/* T-017: the number is what really came in during the last second (taps included); when idle it equals passive. */}
              {income[resource].gt(0) || perSec[resource].gt(0) ? (
                <Text style={styles.rate} numberOfLines={1} maxFontSizeMultiplier={HUD_FONT_SCALE}>
                  {t('status.ratePerSec', { amount: HUD_FORMAT[resource](income[resource].gt(0) ? income[resource] : perSec[resource]) })}
                </Text>
              ) : null}
            </View>
          );
          // Only a resource that appears during this session slides in; on load the HUD is just there.
          return shownOnMount.current.has(resource) ? (
            <View key={resource} style={styles.statSlot}>{box}</View>
          ) : (
            <FadeSlideIn key={resource} from="top" duration="slow" style={styles.statSlot}>{box}</FadeSlideIn>
          );
        })}
      </View>

      <View style={styles.stressRow}>
        <View style={styles.stressHeader}>
          <View style={styles.stressLeft}>
            <DevGlyph name={resources.stress.glyph} size={11} color={stressColor} />
            <Text style={styles.stressLabel} numberOfLines={1} maxFontSizeMultiplier={HUD_FONT_SCALE}>
              {t('resources.stress')}: {Math.round(stress)}%
            </Text>
            <ResilienceTag />
          </View>
          <Animated.Text style={[styles.stressHint, stressInZone && styles.throttlingHint, stressShake]} numberOfLines={2} maxFontSizeMultiplier={HUD_FONT_SCALE}>
            {stressInZone
              ? `${t('status.throttling')} · -${getStressPenaltyPercent(stress)}% ${t('status.output')}`
              : t('status.optimal')}
          </Animated.Text>
        </View>
        <Meter animated pulse={stressInZone} kind="stress" ratio={stress / 100} color={stressColor} />
      </View>
    </ColorTransitionView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.raised,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  topRowActions: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rankBadge: {
    flexShrink: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.sunken,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
    gap: 6,
  },
  rankText: {
    flexShrink: 1,
    color: colors.text.primary,
    fontFamily: typography.mono,
    fontWeight: '800',
    fontSize: typography.sizes.xs,
  },
  comboProgress: {
    alignItems: 'flex-end',
    gap: 3,
  },
  comboMeter: { width: 64 },
  comboText: {
    color: colors.text.muted,
    fontFamily: typography.mono,
    fontSize: typography.sizes.xs,
  },
  resourcesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: 4,
  },
  statSlot: {
    flex: 1,
    minWidth: 0,
  },
  statBox: {
    // flexGrow, not flex: 1: inside the auto-height statSlot, flex: 1 means flexBasis 0 and Android collapses the box to 0 height
    flexGrow: 1,
    backgroundColor: colors.surface.inset,
    padding: 7,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'flex-start',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  label: {
    ...typography.roles.label,
    flexShrink: 1,
  },
  value: {
    color: colors.text.primary,
    fontFamily: typography.mono,
    fontSize: typography.sizes.xs,
    fontWeight: '900',
    marginTop: 2,
    // The count-up text is an input: give it the box's width so changing digits never re-measure it.
    width: '100%',
  },
  rate: {
    ...typography.roles.label,
    color: colors.text.secondary,
    marginTop: 2,
  },
  stressRow: {
    marginTop: 2,
  },
  stressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  stressLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stressLabel: {
    color: colors.text.secondary,
    fontFamily: typography.mono,
    fontSize: typography.sizes.xs,
    fontWeight: '700',
  },
  stressHint: {
    flexShrink: 1,
    textAlign: 'right',
    color: colors.text.muted,
    fontFamily: typography.mono,
    fontSize: typography.sizes.xs,
    letterSpacing: 0.5,
  },
  throttlingHint: {
    color: colors.accent.red,
    fontWeight: '800',
  },
});
