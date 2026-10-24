import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CAREER_RANKS } from '@entities/career-rank';
import { useGameLoop } from '@entities/game-loop';
import { HeaderHud } from '@widgets/header-hud';
import { WorkspaceClicker } from '@widgets/workspace-clicker';
import { SkillsCatalog } from '@widgets/skills-catalog';
import { CareerRoadmap } from '@widgets/career-roadmap';
import { SimulatedLeaderboard } from '@widgets/simulated-leaderboard';
import { BottomDock, type ActiveTab } from '@widgets/bottom-dock';
import { useSkillStore } from '@features/purchase-skill';
import { SettingsPanel } from '@widgets/settings';
import { colors, getRankTheme, spacing, typography } from '@shared/theme';
import { t, useLocale } from '@shared/i18n';

export function GameScreen() {
  useGameLoop();
  useLocale();
  const [activeTab, setActiveTab] = useState<ActiveTab>('work');

  const storedRank = useSkillStore((state) => state.currentRank);
  const rank = CAREER_RANKS[Math.min(storedRank, CAREER_RANKS.length - 1)];
  const rankTheme = getRankTheme(rank.id);

  const renderTab = () => {
    switch (activeTab) {
      case 'skills':
        return <SkillsCatalog />;
      case 'career':
        return <CareerRoadmap currentRankId={rank.id} />;
      case 'leaders':
        return <SimulatedLeaderboard />;
      case 'settings':
        return <SettingsPanel />;
      case 'work':
      default:
        return <WorkspaceClicker />;
    }
  };

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: rankTheme.appBackground }]}
      edges={['top', 'bottom']}
    >
      <HeaderHud rankTitle={t(`career.ranks.${rank.id}.title`)} rankIndex={rank.id} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={[styles.kicker, { color: rankTheme.accentBright }]}>
            {t('app.session')} // {t(`career.ranks.${rank.id}.title`).toUpperCase()}
          </Text>
          <Text style={styles.statusBadge}>{t(`career.ranks.${rank.id}.desc`)}</Text>
        </View>
        {renderTab()}
      </ScrollView>
      <BottomDock activeTab={activeTab} onChangeTab={setActiveTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.app,
  },
  content: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  kicker: {
    color: colors.accent.amber,
    fontFamily: typography.mono,
    fontSize: typography.sizes.xxs,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  statusBadge: {
    color: colors.text.secondary,
    fontFamily: typography.mono,
    fontSize: typography.sizes.xs,
    marginTop: 4,
    textAlign: 'center',
  },
});
