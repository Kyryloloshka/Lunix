import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCurrencyStore } from '@entities/currency';
import {
  getFirstUnmetRequirement,
  getRankProgress,
  getRequirementRatio,
  getRequirementShortfall,
  getVisibleLadder,
  type LadderStep,
  type RankResource,
  type RequirementProgress,
} from '@entities/career-rank';
import {
  Badge,
  DevGlyph,
  FadeSlideIn,
  MIN_TOUCH_TARGET,
  Panel,
  PanelHeader,
  ProgressBar,
  ResourceValue,
  type GlyphName,
} from '@shared/ui';
import { colors, radii, resources, spacing, typography } from '@shared/theme';
import type { Decimal } from '@shared/lib/decimal';
import { formatCurrency, formatDecimal } from '@shared/lib/formatters';
import { t, useLocale } from '@shared/i18n';
import { useSkillStore } from '@features/purchase-skill';
import { PromotionCelebration } from './PromotionCelebration';

interface CareerRoadmapProps {
  currentRankId: number;
  onPromote?: (nextRankId: number) => void;
}

const RANK_GLYPHS: Record<number, GlyphName> = {
  0: 'terminal',
  1: 'html',
  2: 'javascript',
  3: 'code',
  4: 'git-commit',
  5: 'git-branch',
  6: 'cpu',
  7: 'server',
  8: 'system-design',
  9: 'network',
  10: 'rank',
};

const FORMAT: Record<RankResource, (value: Decimal) => string> = {
  cognitive: (value) => formatDecimal(value),
  capital: (value) => formatCurrency(value),
  influence: (value) => formatDecimal(value),
};

const NODE_SIZE = 36;

function requirementLabel({ requirement }: RequirementProgress): string {
  switch (requirement.type) {
    case 'earned':
      return t('career.reqEarned', { resource: t(`resources.${requirement.resource}`) });
    case 'spend':
      return t('career.reqSpend', { resource: t(`resources.${requirement.resource}`) });
    case 'skillLevel':
      return t('career.reqSkill', { skill: t(`skills.items.${requirement.skillId}.name`) });
  }
}

function requirementValue({ requirement, current, target }: RequirementProgress): string {
  if (requirement.type === 'skillLevel') return `${current.toNumber()} / ${requirement.level}`;
  const format = FORMAT[requirement.resource];
  return `${format(current)} / ${format(target)}`;
}

function requirementColor({ requirement, met }: RequirementProgress): string {
  if (met) return colors.feedback.success;
  if (requirement.type === 'skillLevel') return colors.accent.amber;
  return resources[requirement.resource].color;
}

/** Why the promote button is disabled, in words (state is never conveyed by color alone). */
function blockerText(blocker: RequirementProgress): string {
  const { requirement } = blocker;
  if (requirement.type === 'skillLevel') {
    return t('career.missingSkill', {
      skill: t(`skills.items.${requirement.skillId}.name`),
      level: requirement.level,
    });
  }
  return t('career.missingResource', {
    amount: FORMAT[requirement.resource](getRequirementShortfall(blocker)),
    resource: t(`resources.${requirement.resource}`),
  });
}

/** Ladder steps top-to-bottom for rendering: silhouette, next, current, then passed ranks. */
function topDown(steps: LadderStep[]): LadderStep[] {
  return [...steps].reverse();
}

export function CareerRoadmap({ currentRankId, onPromote }: CareerRoadmapProps) {
  useLocale();
  const totalCapitalEarned = useCurrencyStore((state) => state.totalCapitalEarned);
  const totalCognitiveEarned = useCurrencyStore((state) => state.totalCognitiveEarned);
  const capital = useCurrencyStore((state) => state.capital);
  const cognitive = useCurrencyStore((state) => state.cognitive);
  const influence = useCurrencyStore((state) => state.influence);
  const levels = useSkillStore((state) => state.levels);
  const promote = useSkillStore((state) => state.promote);
  const [celebratedRank, setCelebratedRank] = useState<number | null>(null);
  const progressContext = {
    earned: { cognitive: totalCognitiveEarned, capital: totalCapitalEarned },
    balance: { cognitive, capital, influence },
    levels,
  };

  const steps = topDown(getVisibleLadder(currentRankId));

  const renderRank = (rankId: number, state: 'past' | 'current' | 'next') => {
    const title = t(`career.ranks.${rankId}.title`);
    const isNext = state === 'next';
    const progress = isNext ? getRankProgress(rankId, progressContext) : [];
    const blocker = getFirstUnmetRequirement(progress);
    const canPromoteNow = isNext && blocker === null;
    const reason = blocker ? blockerText(blocker) : t('career.readyToPromote');

    return (
      <View
        style={[
          styles.stepCard,
          state === 'current' && styles.stepCardCurrent,
          isNext && styles.stepCardNext,
        ]}
      >
        <View style={styles.stepCardHeader}>
          <Text style={[styles.stepTitle, state === 'past' && styles.textSecondary]}>{title}</Text>
          {state === 'current' ? (
            <Badge tone="success" compact>{t('career.active')}</Badge>
          ) : isNext ? (
            <Badge tone="flow" compact>{t('career.nextGoal')}</Badge>
          ) : (
            <Badge tone="neutral" compact>{t('career.unlocked')}</Badge>
          )}
        </View>

        <Text style={styles.stepSubtitle}>{t(`career.ranks.${rankId}.desc`)}</Text>

        {isNext ? (
          <View style={styles.requirementsBox}>
            <Text style={styles.reqTitle}>{t('career.reqTitle')}</Text>
            {progress.map((item, itemIndex) => (
              <View key={itemIndex} style={itemIndex > 0 ? styles.reqMargin : undefined}>
                <View style={styles.reqRow}>
                  <Text style={styles.reqLabel}>
                    {item.met ? '✓ ' : ''}
                    {requirementLabel(item)}
                  </Text>
                  {item.requirement.type === 'skillLevel' ? (
                    <Text style={styles.reqValue}>{requirementValue(item)}</Text>
                  ) : (
                    <ResourceValue kind={item.requirement.resource} style={styles.reqValue}>
                      {requirementValue(item)}
                    </ResourceValue>
                  )}
                </View>
                <ProgressBar
                  value={Math.round(getRequirementRatio(item) * 100)}
                  color={requirementColor(item)}
                  trackColor={colors.bg.inset}
                  style={styles.progressBar}
                />
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canPromoteNow }}
              accessibilityLabel={
                canPromoteNow
                  ? t('career.promoteA11y', { rank: title })
                  : t('career.promoteBlockedA11y', { rank: title, reason })
              }
              disabled={!canPromoteNow}
              onPress={() => {
                if (!promote()) return;
                setCelebratedRank(rankId);
                onPromote?.(rankId);
              }}
              style={({ pressed }) => [
                styles.promoteButton,
                !canPromoteNow && styles.promoteButtonDisabled,
                pressed && canPromoteNow && styles.promoteButtonPressed,
              ]}
            >
              <Text style={[styles.promoteText, !canPromoteNow && styles.promoteTextDisabled]}>
                {t('career.promote')}
              </Text>
            </Pressable>
            <Text style={[styles.reason, canPromoteNow && styles.reasonReady]}>{reason}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Panel tone="subtle" style={styles.container}>
      <View style={styles.header}>
        <PanelHeader eyebrow={t('career.heading')} title={t('career.subheading')} />
      </View>

      <View style={styles.list}>
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const reached = step.kind === 'rank' && step.state !== 'next';
          const key = step.kind === 'silhouette' ? 'silhouette' : `rank-${step.rankId}`;

          const node = step.kind === 'silhouette' ? (
            <View style={[styles.nodeBadge, styles.nodeSilhouette]}>
              <Text style={styles.silhouetteGlyph}>?</Text>
            </View>
          ) : (
            <View
              style={[
                styles.nodeBadge,
                step.state === 'past' && styles.nodePast,
                step.state === 'current' && styles.nodeCurrent,
                step.state === 'next' && styles.nodeNext,
              ]}
            >
              <DevGlyph
                name={RANK_GLYPHS[step.rankId] ?? 'code'}
                size={15}
                color={
                  step.state === 'current'
                    ? colors.accent.amberBright
                    : step.state === 'past'
                    ? colors.accent.phosphorBright
                    : colors.accent.amber
                }
              />
            </View>
          );

          const card = step.kind === 'silhouette' ? (
            <View
              style={[styles.stepCard, styles.stepCardSilhouette]}
              accessible
              accessibilityLabel={t('career.silhouetteA11y')}
            >
              <Text style={[styles.stepTitle, styles.textMuted]}>{t('career.silhouetteTitle')}</Text>
              <Text style={[styles.stepSubtitle, styles.textMuted]}>{t('career.silhouetteDesc')}</Text>
            </View>
          ) : (
            renderRank(step.rankId, step.state)
          );

          const row = (
            <View style={styles.stepRow}>
              {!isLast ? (
                <View style={[styles.connectorLine, reached ? styles.connectorLineActive : null]} />
              ) : null}
              {node}
              {card}
            </View>
          );

          // Newly revealed steps (the next rank, the silhouette) "unmask" with an entrance; keyed by
          // rank so a promotion replays it for the step that just came into view.
          return step.kind === 'silhouette' || step.state === 'next' ? (
            <FadeSlideIn key={key} from="top" duration="slow">{row}</FadeSlideIn>
          ) : (
            <View key={key}>{row}</View>
          );
        })}
      </View>

      <PromotionCelebration rankId={celebratedRank} onDismiss={() => setCelebratedRank(null)} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    backgroundColor: colors.bg.surface,
  },
  header: {
    marginBottom: spacing.lg,
  },
  list: {
    paddingLeft: spacing.xs,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    position: 'relative',
  },
  connectorLine: {
    position: 'absolute',
    left: NODE_SIZE / 2 - 1,
    top: NODE_SIZE,
    bottom: -spacing.lg,
    width: 2,
    backgroundColor: colors.border.subtle,
    zIndex: 1,
  },
  connectorLineActive: {
    backgroundColor: colors.accent.phosphor,
  },
  nodeBadge: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: radii.sm,
    backgroundColor: colors.bg.inset,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    marginRight: spacing.sm,
  },
  nodePast: {
    borderColor: colors.accent.phosphorDim,
    backgroundColor: colors.accent.phosphorBg,
  },
  nodeCurrent: {
    borderColor: colors.accent.phosphor,
    backgroundColor: colors.accent.phosphorBg,
    borderWidth: 2,
  },
  nodeNext: {
    borderColor: colors.accent.amber,
    backgroundColor: colors.accent.amberBg,
  },
  nodeSilhouette: {
    borderStyle: 'dashed',
    borderColor: colors.border.active,
  },
  silhouetteGlyph: {
    ...typography.roles.monoNum,
    color: colors.text.muted,
  },
  stepCard: {
    flex: 1,
    backgroundColor: colors.bg.inset,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  stepCardCurrent: {
    borderColor: colors.accent.phosphorDim,
    backgroundColor: colors.bg.surface,
  },
  stepCardNext: {
    borderColor: colors.accent.amber,
    backgroundColor: colors.bg.surface,
  },
  stepCardSilhouette: {
    borderStyle: 'dashed',
    borderColor: colors.border.default,
  },
  stepCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xxs,
  },
  stepTitle: {
    flex: 1,
    minWidth: 0,
    fontFamily: typography.mono,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.black,
    color: colors.text.primary,
  },
  stepSubtitle: {
    ...typography.roles.body,
    fontSize: typography.sizes.xs,
    lineHeight: 16,
    color: colors.text.secondary,
  },
  textSecondary: {
    color: colors.text.secondary,
  },
  textMuted: {
    color: colors.text.muted,
  },
  requirementsBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.bg.inset,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  reqTitle: {
    ...typography.roles.label,
    color: colors.accent.amber,
    marginBottom: spacing.xxs,
  },
  reqRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    columnGap: spacing.sm,
    marginBottom: spacing.xxs,
  },
  reqMargin: {
    marginTop: spacing.xs,
  },
  reqLabel: {
    ...typography.roles.label,
    flexShrink: 1,
    color: colors.text.secondary,
  },
  reqValue: {
    ...typography.roles.label,
    fontVariant: ['tabular-nums'],
    color: colors.text.primary,
  },
  progressBar: {
    marginTop: spacing.xxs,
  },
  promoteButton: {
    marginTop: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.accent.amber,
    backgroundColor: colors.accent.amberBg,
  },
  promoteButtonPressed: {
    backgroundColor: colors.bg.elevated,
  },
  promoteButtonDisabled: {
    borderStyle: 'dashed',
    borderColor: colors.border.default,
    backgroundColor: colors.bg.subtle,
  },
  promoteText: {
    ...typography.roles.label,
    color: colors.accent.amberBright,
  },
  promoteTextDisabled: {
    color: colors.text.muted,
  },
  reason: {
    ...typography.roles.label,
    marginTop: spacing.xs,
    textAlign: 'center',
    color: colors.text.secondary,
  },
  reasonReady: {
    color: colors.feedback.success,
  },
});
