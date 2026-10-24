import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCurrencyStore } from '@entities/currency';
import { CAREER_RANKS } from '@entities/career-rank';
import { Badge, DevGlyph, Panel, ProgressBar, type GlyphName } from '@shared/ui';
import { colors, radii, spacing, typography } from '@shared/theme';
import { formatCurrency, formatInfluence } from '@shared/lib/formatters';
import { t, useLocale } from '@shared/i18n';
import { useSkillStore } from '@features/purchase-skill';

interface CareerRoadmapProps {
  currentRankId: number;
  onPromote?: (nextRankId: number) => void;
}

const RANK_GLYPHS: Record<number, GlyphName> = {
  0: 'terminal',
  1: 'code',
  2: 'git-commit',
  3: 'git-branch',
  4: 'cpu',
  5: 'server',
  6: 'system-design',
  7: 'network',
  8: 'rank',
};

export function CareerRoadmap({ currentRankId, onPromote }: CareerRoadmapProps) {
  useLocale();
  const totalCapitalEarned = useCurrencyStore((state) => state.totalCapitalEarned);
  const influence = useCurrencyStore((state) => state.influence);
  const promote = useSkillStore((state) => state.promote);

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

          // Divide as Decimals: toNumber() turns into Infinity/NaN past 1e308.
          const capitalProgress = rank.requiredCapital.isZero()
            ? 100
            : Math.min(100, Math.round(totalCapitalEarned.divide(rank.requiredCapital).toNumber() * 100));

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
                    {title !== `career.ranks.${rank.id}.title` ? title : rank.title}
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
                  {desc !== `career.ranks.${rank.id}.desc` ? desc : rank.subtitle}
                </Text>

                {isNext ? (
                  <View style={styles.requirementsBox}>
                    <Text style={styles.reqTitle}>{t('career.reqTitle')}</Text>
                    <View style={styles.reqRow}>
                      <Text style={styles.reqLabel}>{t('career.reqCapital')}</Text>
                      <Text style={styles.reqValue}>
                        {formatCurrency(totalCapitalEarned)} / {formatCurrency(rank.requiredCapital)}
                      </Text>
                    </View>
                    <ProgressBar
                      value={capitalProgress}
                      color={colors.accent.phosphor}
                      trackColor={colors.bg.inset}
                      style={styles.progressBar}
                    />

                    {!rank.requiredInfluence.isZero() ? (
                      <View style={[styles.reqRow, styles.reqMargin]}>
                        <Text style={styles.reqLabel}>{t('career.reqInfluence')}</Text>
                        <Text style={styles.reqValue}>
                          {formatInfluence(influence)} / {formatInfluence(rank.requiredInfluence)}
                        </Text>
                      </View>
                    ) : null}
                    {totalCapitalEarned.gte(rank.requiredCapital) && influence.gte(rank.requiredInfluence) ? (
                      <Pressable
                        accessibilityRole="button"
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
