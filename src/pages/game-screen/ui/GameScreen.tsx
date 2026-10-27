import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CAREER_RANKS } from '@entities/career-rank';
import { useGameLoop } from '@entities/game-loop';
import { HeaderHud } from '@widgets/header-hud';
import { WorkspaceClicker } from '@widgets/workspace-clicker';
import { SkillsCatalog } from '@widgets/skills-catalog';
import { TAP_MODE_SWITCH_HEIGHT, TapModeSwitch, shouldShowTapModeSwitch } from '@widgets/tap-mode-switch';
import { IntroSequence } from '@widgets/intro';
import { DockHint, StressHint, TapGuide, useOnboardingSync } from '@widgets/onboarding-hints';
import { NextGoalStrip, useDockBadges } from '@widgets/next-goal';
import { CareerRoadmap } from '@widgets/career-roadmap';
import { SimulatedLeaderboard } from '@widgets/simulated-leaderboard';
import { BottomDock, type ActiveTab } from '@widgets/bottom-dock';
import { useSkillStore } from '@features/purchase-skill';
import { ModalHost } from './ModalHost';
import { SettingsPanel } from '@widgets/settings';
import { CONTENT_MAX_WIDTH, ColorTransitionView, FadeSlideIn, TEXT_MAX_FONT_SCALE } from '@shared/ui';
import { colors, getRankTheme, spacing, typography } from '@shared/theme';
import { t, useLocale } from '@shared/i18n';

/** Tab content slides in this far (dp); smaller than the default entrance so switching feels instant. */
const TAB_SLIDE_DISTANCE = 8;

interface GameScreenProps {
  /** Wired by the app layer, which owns save/load. */
  onResetProgress: () => Promise<void>;
}

export function GameScreen({ onResetProgress }: GameScreenProps) {
  useGameLoop();
  useLocale();
  const [activeTab, setActiveTab] = useState<ActiveTab>('work');
  // Steps close by what the player does (tap, buy, rest); this keeps the onboarding store informed.
  useOnboardingSync(activeTab === 'work');

  const badges = useDockBadges();

  const storedRank =useSkillStore((state) => state.currentRank);
  const rank = CAREER_RANKS[Math.min(storedRank, CAREER_RANKS.length - 1)];
  const rankTheme = getRankTheme(rank.id);

  const hero = (
    <View style={styles.hero}>
      <Text
        style={[styles.kicker, { color: rankTheme.accentBright }]}
        maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}
      >
        {t('app.session')} // {t(`career.ranks.${rank.id}.title`).toUpperCase()}
      </Text>
      <Text style={styles.statusBadge} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>
        {t(`career.ranks.${rank.id}.desc`)}
      </Text>
    </View>
  );

  const renderTab = () => {
    switch (activeTab) {
      case 'skills':
        return <SkillsCatalog />;
      case 'career':
        return <CareerRoadmap currentRankId={rank.id} />;
      case 'leaders':
        return <SimulatedLeaderboard />;
      case 'settings':
        return <SettingsPanel onResetProgress={onResetProgress} />;
      case 'work':
      default:
        return null;
    }
  };

  return (
    // The screen color glides to the new rank's theme after a promotion (T-015); the safe area itself stays transparent.
    <ColorTransitionView backgroundColor={rankTheme.appBackground} style={styles.screen}>
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* One centered column for HUD, tab content and dock; the tab content is the only vertical scroll. */}
      <View style={styles.column}>
        <HeaderHud rankTitle={t(`career.ranks.${rank.id}.title`)} rankIndex={rank.id} />
        {/* Short crossfade + slide on tab change; the key restarts it. Fills the column like the content did. */}
        <FadeSlideIn key={activeTab} from="bottom" distance={TAB_SLIDE_DISTANCE} duration="fast" style={styles.tabTransition}>
        {activeTab === 'work' ? (
          // Console (T-012): no scroll competing with taps; the whole area between HUD and dock is the tap
          // zone. Future buttons on top of it (next goal, tap mode) go into `overlay` so they never pay out.
          <View style={styles.consoleTab}>
            <WorkspaceClicker
              header={(
                <>
                  {/* Reserve the switch's height so the overlay never covers the kicker. */}
                  {shouldShowTapModeSwitch(rank.id) ? <View style={styles.switchSpacer} /> : null}
                  {hero}
                </>
              )}
              overlay={(
                <>
                  <TapModeSwitch />
                  {/* Onboarding hints (T-018) ignore touches, so the tap that closes a step is a normal tap. */}
                  <TapGuide />
                  <StressHint />
                </>
              )}
            />
            {/* Next goal (T-003): a row under the tap zone, so it never covers the editor. It hides
                itself while the first-session guide (T-018) is talking. */}
            <NextGoalStrip onOpenTab={setActiveTab} />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {hero}
            {renderTab()}
          </ScrollView>
        )}
        </FadeSlideIn>
        <DockHint onSkillsTab={activeTab === 'skills'} />
        <BottomDock activeTab={activeTab} onChangeTab={setActiveTab} badges={badges} />
      </View>
      {/* Offline report, promotion, resource unlock: one at a time, in queue order (T-019). */}
      <ModalHost />
      {/* First launch (or replay from settings): covers the game until completed or skipped. */}
      <IntroSequence />
    </SafeAreaView>
    </ColorTransitionView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  tabTransition: {
    flex: 1,
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
  scroll: {
    flex: 1,
  },
  consoleTab: {
    flex: 1,
  },
  switchSpacer: {
    height: TAP_MODE_SWITCH_HEIGHT,
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
    fontSize: typography.sizes.xs,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  statusBadge: {
    color: colors.text.secondary,
    fontFamily: typography.mono,
    fontSize: typography.sizes.xs,
    marginTop: 4,
    textAlign: 'center',
  },
});
