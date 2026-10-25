import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCurrencyStore } from '@entities/currency';
import {
  CAREER_RANKS,
  getRankProgress,
  type RankResource,
  type RequirementProgress,
} from '@entities/career-rank';
import { Badge, DevGlyph, Panel, ProgressBar, ResourceValue, type GlyphName } from '@shared/ui';
import { colors, radii, spacing, typography } from '@shared/theme';
import type { Decimal } from '@shared/lib/decimal';
import { formatCurrency, formatDecimal } from '@shared/lib/formatters';
import { t, useLocale } from '@shared/i18n';
import { useSkillStore } from '@features/purchase-skill';

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

/** 0–100 for a progress bar. Divides as Decimals: toNumber() on the raw values breaks past 1e308. */
function requirementPercent({ current, target, met }: RequirementProgress): number {
  if (met || target.isZero()) return 100;
  return Math.min(100, Math.round(current.divide(target).toNumber() * 100));
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
  const progressContext = {
    earned: { cognitive: totalCognitiveEarned, capital: totalCapitalEarned },
    balance: { cognitive, capital, influence },
    levels,
  };

  return (
    <Panel tone="subtle" style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>{t('career.heading')}</Text>
          <Text style={styles.title}>{t('career.subheading')}</Text>
        </View>
        <Badge tone="flow">
          {t('career.progressBadge', {
            current: currentRankId + 1,
            total: CAREER_RANKS.length,
          })}
        </Badge>
      </View>

      <View style={styles.list}>
        {CAREER_RANKS.map((rank, index) => {
          const isUnlocked = index <= currentRankId;
          const isCurrent = index === currentRankId;
          const isNext = index === currentRankId + 1;

          const title = t(`career.ranks.${rank.id}.title`);
          const desc = t(`career.ranks.${rank.id}.desc`);
          const glyphName = RANK_GLYPHS[rank.id] || 'code';

          const progress = isNext ? getRankProgress(rank.id, progressContext) : [];
          const canPromoteNow = progress.length > 0 && progress.every((item) => item.met);

          return (
            <View key={rank.id} style={styles.stepRow}>
              {index < CAREER_RANKS.length - 1 ? (
                <View
                  style={[
                    styles.connectorLine,
                    isUnlocked && styles.connectorLineActive,
                  ]}
                />
              ) : null}

              <View
                style={[
                  styles.nodeBadge,
                  isUnlocked && styles.nodeUnlocked,
                  isCurrent && styles.nodeCurrent,
                ]}
              >
                <DevGlyph
                  name={glyphName}
                  size={15}
                  color={
                    isCurrent
                      ? colors.accent.amberBright
                      : isUnlocked
                      ? colors.accent.phosphorBright
                      : colors.text.muted
                  }
                />
              </View>

              <View
                style={[
                  styles.stepCard,
                  isCurrent && styles.stepCardCurrent,
                  !isUnlocked && !isNext && styles.stepCardLocked,
                ]}
              >
                <View style={styles.stepCardHeader}>
                  <Text style={[styles.stepTitle, !isUnlocked && styles.textMuted]}>
                    {title}
                  </Text>
                  {isCurrent ? (
                    <Badge tone="success" compact>
                      {t('career.active')}
                    </Badge>
                  ) : isUnlocked ? (
                    <Badge tone="neutral" compact>
                      {t('career.unlocked')}
                    </Badge>
                  ) : (
                    <Badge tone="danger" compact>
                      {t('career.locked')}
                    </Badge>
                  )}
                </View>

                <Text style={styles.stepSubtitle}>
                  {desc}
                </Text>

                {isNext ? (
                  <View style={styles.requirementsBox}>
                    <Text style={styles.reqTitle}>{t('career.reqTitle')}</Text>
                    {progress.map((item, itemIndex) => (
                      <View key={itemIndex} style={itemIndex > 0 ? styles.reqMargin : undefined}>
                        <View style={styles.reqRow}>
                          <Text style={styles.reqLabel}>{requirementLabel(item)}</Text>
                          {item.requirement.type === 'skillLevel' ? (
                            <Text style={styles.reqValue}>{requirementValue(item)}</Text>
                          ) : (
                            <ResourceValue kind={item.requirement.resource} style={styles.reqValue}>
                              {requirementValue(item)}
                            </ResourceValue>
                          )}
                        </View>
                        <ProgressBar
                          value={requirementPercent(item)}
                          color={item.met ? colors.accent.phosphor : colors.accent.amber}
                          trackColor={colors.bg.inset}
                          style={styles.progressBar}
                        />
                      </View>
                    ))}
                    {canPromoteNow ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('career.promote')}
                        onPress={() => {
                          if (promote()) onPromote?.(rank.id);
                        }}
                        style={styles.promoteButton}
                      >
                        <Text style={styles.promoteText}>{t('career.promote')}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  eyebrow: {
    fontFamily: typography.mono,
    fontSize: typography.sizes.xxs,
    fontWeight: '900',
    color: colors.text.muted,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: '900',
    color: colors.text.primary,
    marginTop: 2,
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
    left: 17,
    top: 36,
    bottom: -16,
    width: 2,
    backgroundColor: colors.border.subtle,
    zIndex: 1,
  },
  connectorLineActive: {
    backgroundColor: colors.accent.phosphor,
  },
  nodeBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.bg.inset,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    marginRight: spacing.sm,
  },
  nodeUnlocked: {
    borderColor: colors.accent.phosphorDim,
    backgroundColor: colors.accent.phosphorBg,
  },
  nodeCurrent: {
    borderColor: colors.accent.amber,
    backgroundColor: colors.accent.amberBg,
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
    borderColor: colors.accent.amber,
    backgroundColor: colors.bg.surface,
  },
  stepCardLocked: {
    opacity: 0.5,
  },
  stepCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepTitle: {
    fontFamily: typography.mono,
    fontSize: typography.sizes.sm,
    fontWeight: '800',
    color: colors.text.primary,
  },
  stepSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  textMuted: {
    color: colors.text.muted,
  },
  requirementsBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.bg.surface,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  reqTitle: {
    fontFamily: typography.mono,
    fontSize: 9,
    fontWeight: '900',
    color: colors.accent.amber,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  reqRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  reqMargin: {
    marginTop: 4,
  },
  reqLabel: {
    fontFamily: typography.mono,
    fontSize: typography.sizes.xxs,
    color: colors.text.muted,
    fontWeight: '700',
  },
  reqValue: {
    fontFamily: typography.mono,
    fontSize: typography.sizes.xxs,
    color: colors.text.primary,
    fontWeight: '800',
  },
  progressBar: {
    marginTop: 3,
  },
  promoteButton: {
    marginTop: spacing.sm,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.accent.amber,
    backgroundColor: colors.accent.amberBg,
  },
  promoteText: {
    color: colors.accent.amberBright,
    fontFamily: typography.mono,
    fontWeight: '900',
    fontSize: typography.sizes.xxs,
  },
});
