import { skillById } from '@entities/skill';
import { Decimal } from '@shared/lib/decimal';

/**
 * Onboarding progress that is saved (T-018). Every flag is monotonic: once a step is done it never
 * comes back, so the guide cannot nag a player who already knows the game.
 */
export interface OnboardingSnapshot {
  /** The intro was played or skipped. */
  introDone: boolean;
  /** The first Cognitive was earned by a tap. */
  tapDone: boolean;
  /** The first skill was bought. */
  buyDone: boolean;
  /** The stress explanation was shown and acknowledged. */
  stressDone: boolean;
}

export const FRESH_ONBOARDING: OnboardingSnapshot = {
  introDone: false,
  tapDone: false,
  buyDone: false,
  stressDone: false,
};

/** Existing players (saves from before onboarding) must not see a tutorial. */
export const COMPLETED_ONBOARDING: OnboardingSnapshot = {
  introDone: true,
  tapDone: true,
  buyDone: true,
  stressDone: true,
};

/** The first skill the guide points at. Its cost is read from the registry, never hardcoded. */
export const FIRST_SKILL_ID = 'html-tags';
/** The stress card opens at this level of the meter... */
export const STRESS_HINT_OPEN_AT = 30;
/** ...and counts as understood once the player has rested down to this level. */
export const STRESS_HINT_CLEAR_AT = 15;

/** Live game values the guide reacts to. Collected by the widget layer from the stores. */
export interface OnboardingSignals {
  /** Cognitive in hand (what the first skill is paid with). */
  cognitive: Decimal;
  /** Lifetime Cognitive, > 0 after the first tap. */
  cognitiveEarned: Decimal;
  skillLevelsTotal: number;
  stress: number;
  rank: number;
  /** The Console tab is on screen: the stress card is only shown (and counted as seen) there. */
  consoleActive: boolean;
}

export interface OnboardingProgress extends OnboardingSnapshot {
  /** The stress card is on screen. Session state: a reload starts it over if it is still pending. */
  stressHintOpen: boolean;
}

export function getFirstSkillCost(): Decimal {
  return skillById(FIRST_SKILL_ID)?.baseCost ?? Decimal.from(10);
}

/**
 * Advances the flags from live signals. Pure and idempotent: calling it twice with the same
 * signals changes nothing. Returns the same object when nothing changed, so stores can skip a write.
 */
export function advanceOnboarding(progress: OnboardingProgress, signals: OnboardingSignals): OnboardingProgress {
  // A player who already holds a skill or a job is past these steps whatever the flags say.
  const pastBasics = signals.rank > 0 || signals.skillLevelsTotal > 0;
  const tapDone = progress.tapDone || pastBasics || signals.cognitiveEarned.isPositive();
  const buyDone = progress.buyDone || pastBasics;

  let { stressDone, stressHintOpen } = progress;
  if (signals.rank > 0) {
    stressDone = true;
    stressHintOpen = false;
  } else if (!stressDone) {
    if (!stressHintOpen && signals.consoleActive && tapDone && signals.stress >= STRESS_HINT_OPEN_AT) {
      stressHintOpen = true;
    } else if (stressHintOpen && signals.stress < STRESS_HINT_CLEAR_AT) {
      // Rested while the card was on screen: the player saw the meter drop, which is the lesson.
      // Rested elsewhere: the card was never read, so it may open again on the next sprint.
      stressDone = signals.consoleActive;
      stressHintOpen = false;
    }
  }

  if (
    tapDone === progress.tapDone
    && buyDone === progress.buyDone
    && stressDone === progress.stressDone
    && stressHintOpen === progress.stressHintOpen
  ) {
    return progress;
  }
  return { ...progress, tapDone, buyDone, stressDone, stressHintOpen };
}

/** What the on-screen guide shows right now. `null` means nothing to show. */
export type GuideStage = 'tap' | 'warmup' | 'buy' | null;

/**
 * 'tap': nothing earned yet, the tap zone is highlighted.
 * 'warmup': first Cognitive earned, the player is collecting the price of the first skill.
 * 'buy': the first skill is affordable, an arrow points at the Stack tab.
 */
export function getGuideStage(progress: OnboardingSnapshot, canAffordFirstSkill: boolean): GuideStage {
  if (!progress.introDone || progress.buyDone) return null;
  if (!progress.tapDone) return 'tap';
  return canAffordFirstSkill ? 'buy' : 'warmup';
}
