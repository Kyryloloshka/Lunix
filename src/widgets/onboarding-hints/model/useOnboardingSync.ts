import { useEffect, useRef } from 'react';
import { useCurrencyStore } from '@entities/currency';
import { useSkillStore } from '@features/purchase-skill';
import { useOnboardingStore, type OnboardingSignals } from '@features/onboarding';

function readSignals(consoleActive: boolean): OnboardingSignals {
  const currency = useCurrencyStore.getState();
  const skills = useSkillStore.getState();
  return {
    cognitive: currency.cognitive,
    cognitiveEarned: currency.totalCognitiveEarned,
    skillLevelsTotal: Object.values(skills.levels).reduce((sum, level) => sum + level, 0),
    stress: currency.stress,
    rank: skills.currentRank,
    consoleActive,
  };
}

function isFinished(): boolean {
  const { tapDone, buyDone, stressDone } = useOnboardingStore.getState();
  return tapDone && buyDone && stressDone;
}

/**
 * Feeds live game values into the onboarding store so steps close by what the player does (tapped,
 * bought, rested), never by a "Next" button. Subscribes outside React, so a currency tick does not
 * re-render anything; the store skips the write when nothing changed. Stops listening once every
 * step is done.
 */
export function useOnboardingSync(consoleActive: boolean): void {
  const consoleActiveRef = useRef(consoleActive);
  consoleActiveRef.current = consoleActive;

  useEffect(() => {
    const sync = () => {
      if (isFinished()) return;
      useOnboardingStore.getState().sync(readSignals(consoleActiveRef.current));
    };
    sync();
    const unsubscribeCurrency = useCurrencyStore.subscribe(sync);
    const unsubscribeSkills = useSkillStore.subscribe(sync);
    return () => {
      unsubscribeCurrency();
      unsubscribeSkills();
    };
  }, []);

  // The tab changed: re-evaluate once, since no store changed.
  useEffect(() => {
    if (!isFinished()) useOnboardingStore.getState().sync(readSignals(consoleActive));
  }, [consoleActive]);
}
