import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useCurrencyStore } from '@entities/currency';
import type { Decimal } from '@shared/lib/decimal';
import { Badge, DevGlyph, FadeSlideIn, Panel, PanelHeader, ProgressBar, type GlyphName } from '@shared/ui';
import { colors, radii, spacing, typography } from '@shared/theme';
import { formatCurrency } from '@shared/lib/formatters';
import { t, useLocale } from '@shared/i18n';
import { NPC_LEADERS } from '../model/npcLeaders';
import { buildStandings, selectRival } from '../model/standings';

interface LeaderboardEntry {
  id: string;
  name: string;
  role: string;
  capital: Decimal;
  icon: GlyphName;
  place: number;
  isPlayer: boolean;
}

const NPC_ICONS = new Map(NPC_LEADERS.map((npc) => [npc.id, npc.icon]));
const PLAYER_ICON: GlyphName = 'trend';

export function SimulatedLeaderboard() {
  const locale = useLocale();
  const totalCapitalEarned = useCurrencyStore((state) => state.totalCapitalEarned);

  const { leaderboard, rival } = useMemo(() => {
    const standings = buildStandings(NPC_LEADERS, totalCapitalEarned);
    const entries: LeaderboardEntry[] = standings.map((standing) =>
      standing.isPlayer
        ? {
            ...standing,
            name: t('leaderboard.playerDefaultName'),
            role: t('leaderboard.playerRole'),
            icon: PLAYER_ICON,
          }
        : {
            ...standing,
            name: t(`leaderboard.entries.${standing.id}.name`),
            role: t(`leaderboard.entries.${standing.id}.role`),
            icon: NPC_ICONS.get(standing.id) ?? 'code',
          },
    );
    return { leaderboard: entries, rival: selectRival(standings) };
    // locale: names are re-translated when the language changes.
  }, [locale, totalCapitalEarned]);

  const playerPlace = leaderboard.find((item) => item.isPlayer)?.place ?? leaderboard.length;
  const rivalName = rival ? t(`leaderboard.entries.${rival.id}.name`) : '';
  const rivalGap = rival ? formatCurrency(rival.gap) : '';
  const rivalPercent = rival ? Math.floor(rival.progress * 100) : 100;

  return (
    <Panel tone="subtle" style={styles.container}>
      <View style={styles.header}>
        <PanelHeader
          eyebrow={t('leaderboard.heading')}
          title={t('leaderboard.subheading')}
          trailing={<Badge tone="flow">{t('leaderboard.rankBadge', { rank: playerPlace })}</Badge>}
        />
      </View>

      <Text style={styles.disclaimer}>{t('leaderboard.disclaimer')}</Text>

      <FadeSlideIn key={rival?.id ?? 'top'} from="top" duration="fast">
        <View
          style={styles.rivalCard}
          accessible
          accessibilityRole="summary"
          accessibilityLabel={
            rival
              ? t('leaderboard.rivalA11y', { name: rivalName, gap: rivalGap, percent: rivalPercent })
              : `${t('leaderboard.rivalTop')}. ${t('leaderboard.rivalTopHint')}`
          }
        >
          <Text style={styles.rivalEyebrow}>{t('leaderboard.rivalEyebrow')}</Text>
          {rival ? (
            <>
              <View style={styles.rivalRow}>
                <Text style={styles.rivalTarget} numberOfLines={2}>
                  {t('leaderboard.rivalTarget', { name: rivalName })}
                </Text>
                <Text style={styles.rivalGap}>{t('leaderboard.rivalGap', { gap: rivalGap })}</Text>
              </View>
              <ProgressBar
                value={rival.progress}
                max={1}
                color={colors.accent.phosphorBright}
                style={styles.rivalBar}
              />
            </>
          ) : (
            <>
              <Text style={styles.rivalTarget}>{t('leaderboard.rivalTop')}</Text>
              <Text style={styles.role}>{t('leaderboard.rivalTopHint')}</Text>
            </>
          )}
        </View>
      </FadeSlideIn>

      <View style={styles.list}>
        {leaderboard.map((item) => {
          const isTop3 = item.place <= 3;
          const row = (
            <View
              style={[
                styles.row,
                item.isPlayer && styles.playerRow,
                isTop3 && styles.top3Row,
              ]}
            >
              <View style={styles.rankCol}>
                <Text
                  style={[
                    styles.rankNum,
                    isTop3 && styles.top3RankNum,
                    item.isPlayer && styles.playerRankNum,
                  ]}
                >
                  #{item.place}
                </Text>
              </View>

              <View style={styles.iconBox}>
                <DevGlyph
                  name={item.icon}
                  size={14}
                  color={item.isPlayer ? colors.accent.phosphorBright : colors.text.muted}
                />
              </View>

              <View style={styles.infoCol}>
                <Text style={[styles.name, item.isPlayer && styles.playerName]}>{item.name}</Text>
                <Text style={styles.role}>{item.role}</Text>
              </View>

              <View style={styles.capitalCol}>
                <Text
                  style={[
                    styles.capitalText,
                    item.isPlayer && styles.playerCapitalText,
                  ]}
                >
                  {formatCurrency(item.capital)}
                </Text>
              </View>
            </View>
          );

          // Re-mounting the player row on a new place plays the overtake animation (fade only under reduced motion).
          return item.isPlayer ? (
            <FadeSlideIn key={`player-${item.place}`} from="bottom">
              {row}
            </FadeSlideIn>
          ) : (
            <View key={item.id}>{row}</View>
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
    marginBottom: 4,
  },
  disclaimer: {
    fontSize: typography.sizes.xxs,
    color: colors.text.muted,
    marginBottom: spacing.md,
  },
  rivalCard: {
    backgroundColor: colors.bg.inset,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.accent.phosphorDim,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: 4,
  },
  rivalEyebrow: {
    fontFamily: typography.mono,
    fontSize: typography.sizes.xxs,
    fontWeight: '800',
    color: colors.text.muted,
  },
  rivalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  rivalTarget: {
    flexShrink: 1,
    fontFamily: typography.mono,
    fontSize: typography.sizes.xs,
    fontWeight: '800',
    color: colors.text.primary,
  },
  rivalGap: {
    fontFamily: typography.mono,
    fontSize: typography.sizes.xs,
    fontWeight: '900',
    color: colors.accent.phosphorBright,
  },
  rivalBar: {
    marginTop: 2,
  },
  list: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.inset,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  playerRow: {
    backgroundColor: colors.accent.phosphorBg,
    borderColor: colors.accent.phosphorDim,
  },
  top3Row: {
    borderColor: colors.border.default,
  },
  rankCol: {
    width: 28,
  },
  rankNum: {
    fontFamily: typography.mono,
    fontSize: 10,
    fontWeight: '800',
    color: colors.text.muted,
  },
  top3RankNum: {
    color: colors.accent.amber,
    fontWeight: '900',
  },
  playerRankNum: {
    color: colors.accent.phosphorBright,
  },
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: radii.xs,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: typography.mono,
    fontSize: typography.sizes.xs,
    fontWeight: '800',
    color: colors.text.primary,
  },
  playerName: {
    color: colors.accent.phosphorBright,
  },
  role: {
    fontSize: typography.sizes.xxs,
    color: colors.text.secondary,
    marginTop: 1,
  },
  capitalCol: {
    alignItems: 'flex-end',
  },
  capitalText: {
    fontFamily: typography.mono,
    fontSize: typography.sizes.xs,
    fontWeight: '900',
    color: colors.text.primary,
  },
  playerCapitalText: {
    color: colors.accent.phosphorBright,
  },
});
