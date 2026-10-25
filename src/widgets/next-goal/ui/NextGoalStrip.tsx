import { Pressable, StyleSheet, Text, View } from 'react-native';
import { skillById, type SkillResource } from '@entities/skill';
import { useCurrencyStore } from '@entities/currency';
import type { ResourceAmounts, ResourceRates } from '@entities/currency';
import { getFirstSkillCost, getGuideStage, useOnboardingStore } from '@features/onboarding';
import {
  getWaitHint,
  getWaitIncome,
  selectNextGoal,
  type NextGoal,
  type NextGoalTab,
} from '@features/purchase-skill';
import type { Decimal } from '@shared/lib/decimal';
import { formatCurrency, formatDecimal } from '@shared/lib/formatters';
import { DENSE_TEXT_MAX_FONT_SCALE, MIN_TOUCH_TARGET, ProgressBar, ResourceValue } from '@shared/ui';
import { colors, radii, resources, spacing, typography } from '@shared/theme';
import { t, useLocale } from '@shared/i18n';
import { readNextGoalState } from '../model/useNextGoalState';

interface NextGoalStripProps {
  /** Opens the tab where the goal is worked on. Goals that live on the Console are not tappable. */
  onOpenTab: (tab: NextGoalTab) => void;
}

const FORMAT: Record<SkillResource, (value: Decimal) => string> = {
  cognitive: (value) => formatDecimal(value),
  capital: (value) => formatCurrency(value),
  influence: (value) => formatDecimal(value),
};

const TAB_LABEL_KEYS: Record<NextGoalTab, string> = {
  work: 'nav.work',
  skills: 'nav.skills',
  career: 'nav.career',
};

function goalTitle(goal: NextGoal): string {
  switch (goal.kind) {
    case 'buySkill':
      return t('nextGoal.buySkill', { skill: t(`skills.items.${goal.skillId}.name`), level: goal.level });
    case 'buyUpgrade':
      return t('nextGoal.buyUpgrade');
    case 'earn':
      return t('nextGoal.earn', { resource: t(`resources.${goal.resource}`), rank: t(`career.ranks.${goal.rankId}.title`) });
    case 'spend':
      return t('nextGoal.spend', { resource: t(`resources.${goal.resource}`), rank: t(`career.ranks.${goal.rankId}.title`) });
    case 'promote':
      return t('nextGoal.promote', { rank: t(`career.ranks.${goal.rankId}.title`) });
  }
}

/** Right-hand status: READY, "~12 s" at the current income, or nothing when no estimate is useful. */
function goalStatus(goal: NextGoal, income: ResourceAmounts, rates: ResourceRates): string | null {
  if (goal.ready) return t('nextGoal.ready');
  const hint = getWaitHint(goal.target, goal.current, getWaitIncome(goal.resource, income, rates));
  if (hint.kind !== 'seconds') return null;
  return hint.seconds < 60
    ? t('skills.waitSeconds', { seconds: hint.seconds })
    : t('skills.waitMinutes', { minutes: Math.ceil(hint.seconds / 60) });
}

/** The strip must not talk over the first-session guide (T-018): hidden until its steps are done. */
function useGuideActive(): boolean {
  const introDone = useOnboardingStore((state) => state.introDone);
  const replaying = useOnboardingStore((state) => state.replayingIntro);
  const tapDone = useOnboardingStore((state) => state.tapDone);
  const buyDone = useOnboardingStore((state) => state.buyDone);
  const stressDone = useOnboardingStore((state) => state.stressDone);
  const stressHintOpen = useOnboardingStore((state) => state.stressHintOpen);
  const canAfford = useCurrencyStore((state) => state.cognitive.gte(getFirstSkillCost()));
  if (!introDone || replaying || stressHintOpen) return true;
  return getGuideStage({ introDone, tapDone, buyDone, stressDone }, canAfford) !== null;
}

/**
 * "Next goal" (T-003): the single nearest thing to do with its progress, always on the Console. The
 * goal comes from the pure `selectNextGoal`; this component only renders it. It follows the live
 * balances, so it re-renders with the game tick (it is a few views, not a list).
 */
export function NextGoalStrip({ onOpenTab }: NextGoalStripProps) {
  useLocale();
  const guideActive = useGuideActive();
  // Subscribing re-renders on every change; the goal itself is recomputed from the live stores.
  const income = useCurrencyStore((state) => state.income);
  const rates = useCurrencyStore((state) => state.rates);
  useCurrencyStore((state) => state.cognitive);
  useCurrencyStore((state) => state.capital);
  useCurrencyStore((state) => state.influence);
  if (guideActive) return null;

  const goal = selectNextGoal(readNextGoalState());
  if (goal === null) return null;

  const title = goalTitle(goal);
  const status = goalStatus(goal, income, rates);
  const color = goal.kind === 'promote' ? colors.accent.amberBright : resources[goal.resource].color;
  const tappable = goal.tab !== 'work';
  const tabName = t(TAB_LABEL_KEYS[goal.tab]);
  // Never "76 / 13": past the target the numerator stops at the target (compared as Decimals).
  const shownCurrent = goal.current.gte(goal.target) ? goal.target : goal.current;
  const currentText = FORMAT[goal.resource](shownCurrent);
  const targetText = FORMAT[goal.resource](goal.target);
  const progress = goal.kind === 'promote' ? null : `${currentText} / ${targetText}`;
  const spoken = [
    t('nextGoal.a11yLabel', { goal: title }),
    progress ? t('nextGoal.progress', { current: currentText, target: targetText }) : null,
    status,
  ].filter(Boolean).join('. ');

  const body = (
    <>
      <View style={styles.row}>
        <Text style={styles.kicker} maxFontSizeMultiplier={DENSE_TEXT_MAX_FONT_SCALE}>{t('nextGoal.label')}</Text>
        {status ? (
          <Text style={[styles.status, goal.ready && styles.statusReady]} maxFontSizeMultiplier={DENSE_TEXT_MAX_FONT_SCALE}>{status}</Text>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={2} maxFontSizeMultiplier={DENSE_TEXT_MAX_FONT_SCALE}>{title}</Text>
      {progress ? (
        <View style={styles.progressRow}>
          <View style={styles.bar}>
            <ProgressBar value={goal.ratio} max={1} color={color} height={5} />
          </View>
          <ResourceValue kind={goal.resource} style={styles.progressText} numberOfLines={1}>{progress}</ResourceValue>
        </View>
      ) : null}
    </>
  );

  return (
    <View style={styles.anchor}>
      {tappable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={spoken}
          accessibilityHint={t('nextGoal.a11yHint', { tab: tabName })}
          onPress={() => onOpenTab(goal.tab)}
          style={({ pressed }) => [styles.card, goal.ready && styles.cardReady, pressed && styles.cardPressed]}
          testID="next-goal-strip"
        >
          {body}
        </Pressable>
      ) : (
        <View accessible accessibilityLabel={spoken} style={[styles.card, goal.ready && styles.cardReady]} testID="next-goal-strip">
          {body}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // A normal row under the tap zone and above the dock: it never covers the editor, and a touch on it
  // is not a tap (no income). Same horizontal inset as the dock.
  anchor: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  card: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.raised,
    gap: 3,
  },
  cardReady: {
    borderColor: colors.accent.amber,
  },
  cardPressed: {
    opacity: 0.8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kicker: {
    color: colors.text.muted,
    fontFamily: typography.mono,
    fontSize: typography.sizes.xxs,
    fontWeight: '800',
    letterSpacing: 1,
  },
  status: {
    color: colors.text.secondary,
    fontFamily: typography.mono,
    fontSize: typography.sizes.xxs,
    fontWeight: '800',
  },
  statusReady: {
    color: colors.accent.amberBright,
  },
  title: {
    color: colors.text.primary,
    fontFamily: typography.mono,
    fontSize: typography.sizes.xs,
    fontWeight: '700',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bar: {
    // Takes what the numbers leave. flexGrow, not flex: 1: an auto-height parent would collapse it.
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 40,
  },
  progressText: {
    color: colors.text.secondary,
    fontFamily: typography.mono,
    fontSize: typography.sizes.xxs,
    fontWeight: '800',
  },
});
