import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useCurrencyStore } from '@entities/currency';
import { Decimal } from '@shared/lib/decimal';
import { Badge, DevGlyph, Panel, PanelHeader, type GlyphName } from '@shared/ui';
import { colors, radii, spacing, typography } from '@shared/theme';
import { formatCurrency } from '@shared/lib/formatters';
import { t, useLocale } from '@shared/i18n';

interface LeaderboardEntry {
  id: string;
  name: string;
  role: string;
  capital: Decimal;
  icon: GlyphName;
  isPlayer?: boolean;
}

const NPC_LEADERS: Omit<LeaderboardEntry, 'name' | 'role' | 'isPlayer'>[] = [
  { id: 'sundar', capital: Decimal.from(1e11), icon: 'rank' },
  { id: 'satya', capital: Decimal.from(8.5e10), icon: 'server' },
  { id: 'musk', capital: Decimal.from(7e10), icon: 'bolt' },
  { id: 'alex-arch', capital: Decimal.from(1.5e7), icon: 'system-design' },
  { id: 'dima-lead', capital: Decimal.from(450000), icon: 'git-branch' },
  { id: 'katya-senior', capital: Decimal.from(180000), icon: 'cpu' },
  { id: 'vasya-middle', capital: Decimal.from(65000), icon: 'coffee' },
  { id: 'petya-jun', capital: Decimal.from(12000), icon: 'code' },
  { id: 'olex-trainee', capital: Decimal.from(2000), icon: 'terminal' },
];

export function SimulatedLeaderboard() {
  const locale = useLocale();
  const totalCapitalEarned = useCurrencyStore((state) => state.totalCapitalEarned);

  const leaderboard = useMemo(() => {
    const npcEntries: LeaderboardEntry[] = NPC_LEADERS.map((entry) => ({
      ...entry,
      name: t(`leaderboard.entries.${entry.id}.name`),
      role: t(`leaderboard.entries.${entry.id}.role`),
    }));
    const playerEntry: LeaderboardEntry = {
      id: 'player',
      name: t('leaderboard.playerName', { label: t('leaderboard.you') }),
      role: t('leaderboard.playerRole'),
      capital: totalCapitalEarned,
      icon: 'bolt',
      isPlayer: true,
    };

    const all = [...npcEntries, playerEntry];
    return all.sort((a, b) => b.capital.compareTo(a.capital));
  }, [locale, totalCapitalEarned]);

  const playerRankIndex = leaderboard.findIndex((item) => item.isPlayer) + 1;

  return (
    <Panel tone="subtle" style={styles.container}>
      <View style={styles.header}>
        <PanelHeader
          eyebrow={t('leaderboard.heading')}
          title={t('leaderboard.subheading')}
          trailing={<Badge tone="flow">{t('leaderboard.rankBadge', { rank: playerRankIndex })}</Badge>}
        />
      </View>

      <Text style={styles.disclaimer}>{t('leaderboard.disclaimer')}</Text>

      <View style={styles.list}>
        {leaderboard.map((item, index) => {
          const rankNum = index + 1;
          const isTop3 = rankNum <= 3;

          return (
            <View
              key={item.id}
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
                  #{rankNum}
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
                <View style={styles.nameRow}>
                  <Text style={[styles.name, item.isPlayer && styles.playerName]}>
                    {item.name}
                  </Text>
                  {item.isPlayer ? (
                    <Badge tone="success" compact>
                      {t('leaderboard.you')}
                    </Badge>
                  ) : null}
                </View>
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
