import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getUnlockedResources, type RankResource } from '@entities/career-rank';
import type { Decimal } from '@shared/lib/decimal';
import {
  COMBO_WINDOW_MS,
  FLOW_COMBO_THRESHOLD,
  getStressPenaltyPercent,
  toCountdownSeconds,
  useCurrencyStore,
} from '@entities/currency';
import { FlowCooldownMeter, ResilienceTag } from './RhythmIndicators';
import { formatCurrency, formatDecimal } from '@shared/lib/formatters';
import { DENSE_TEXT_MAX_FONT_SCALE, DevGlyph, FadeSlideIn } from '@shared/ui';
import { colors, getRankTheme, radii, resources, spacing, typography } from '@shared/theme';
import { t, useLocale } from '@shared/i18n';

// HUD numbers sit in a fixed 3-column grid: cap system font scaling so large fonts don't break it
const HUD_FONT_SCALE = DENSE_TEXT_MAX_FONT_SCALE;

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

  const shownOnMount = useRef(new Set(getUnlockedResources(rankIndex)));
  const balances: Record<RankResource, Decimal> = { capital, cognitive, influence };
  const perSec: Record<RankResource, Decimal> = {
    capital: rates.capitalPerSec,
    cognitive: rates.cognitivePerSec,
    influence: rates.influencePerSec,
  };

  const rankTheme = getRankTheme(rankIndex);
  const stressColor = stress > 75
    ? colors.accent.red
    : stress > 45
    ? colors.accent.amber
    : rankTheme.accent;

  return (
    <View style={[styles.container, { borderColor: rankTheme.border, backgroundColor: rankTheme.surfaceTint }]}>
      <View style={styles.topRow}>
        <View style={styles.rankBadge}>
          <DevGlyph name="rank" size={12} color={rankTheme.accentBright} />
          <Text style={styles.rankText} numberOfLines={1} maxFontSizeMultiplier={HUD_FONT_SCALE}>
            {rankTitle}
          </Text>
        </View>

        <View style={styles.topRowActions}>
          {flow.isActive ? (
            <View style={styles.flowBadge}>
              <DevGlyph name={resources.flow.glyph} size={12} color={colors.text.onAccent} />
              <Text style={styles.flowText} numberOfLines={1} maxFontSizeMultiplier={HUD_FONT_SCALE}>
                {t('status.flow')} x{flow.multiplier} · {Math.ceil(flow.remainingMs / 1000)}s
              </Text>
            </View>
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
              <View style={styles.comboTrack}>
                <View
                  style={[
                    styles.comboFill,
                    { width: `${Math.min(100, (flow.comboCount / FLOW_COMBO_THRESHOLD) * 100)}%` },
                  ]}
                />
              </View>
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
              <Text style={styles.value} numberOfLines={1} maxFontSizeMultiplier={HUD_FONT_SCALE}>
                {HUD_FORMAT[resource](balances[resource])}
              </Text>
              {perSec[resource].gt(0) ? (
                <Text style={styles.rate} numberOfLines={1} maxFontSizeMultiplier={HUD_FONT_SCALE}>
                  {t('status.ratePerSec', { amount: HUD_FORMAT[resource](perSec[resource]) })}
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
          <Text style={[styles.stressHint, stress > 70 && styles.throttlingHint]} numberOfLines={2} maxFontSizeMultiplier={HUD_FONT_SCALE}>
            {stress > 70
              ? `${t('status.throttling')} · -${getStressPenaltyPercent(stress)}% ${t('status.output')}`
              : t('status.optimal')}
          </Text>
        </View>
        <View style={styles.stressTrack}>
          <View
            style={[
              styles.stressFill,
              { width: `${stress}%`, backgroundColor: stressColor },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.surface,
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
    backgroundColor: colors.bg.subtle,
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
  flowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: resources.flow.color,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
    gap: 4,
  },
  flowText: {
    color: colors.text.onAccent,
    fontFamily: typography.mono,
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  comboProgress: {
    alignItems: 'flex-end',
    gap: 3,
  },
  comboTrack: {
    width: 64,
    height: 3,
    backgroundColor: colors.bg.inset,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  comboFill: {
    height: '100%',
    backgroundColor: colors.accent.amber,
  },
  comboText: {
    color: colors.text.muted,
    fontFamily: typography.mono,
    fontSize: 10,
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
    flex: 1,
    backgroundColor: colors.bg.inset,
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
  },
  rate: {
    ...typography.roles.label,
    color: colors.text.muted,
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
    fontSize: 10,
    fontWeight: '700',
  },
  stressHint: {
    flexShrink: 1,
    textAlign: 'right',
    color: colors.text.muted,
    fontFamily: typography.mono,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  throttlingHint: {
    color: colors.accent.red,
    fontWeight: '800',
  },
  stressTrack: {
    height: 4,
    backgroundColor: colors.bg.inset,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  stressFill: {
    height: '100%',
    borderRadius: radii.full,
  },
});
