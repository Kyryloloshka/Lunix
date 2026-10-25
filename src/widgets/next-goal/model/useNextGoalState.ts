import { useEffect, useState } from 'react';
import { useCurrencyStore } from '@entities/currency';
import {
  canPromoteNow,
  hasAffordablePurchase,
  useSkillStore,
  type NextGoalState,
} from '@features/purchase-skill';

/** Reads the live stores into the plain input of the pure goal functions. Not a hook: no render captures. */
export function readNextGoalState(): NextGoalState {
  const currency = useCurrencyStore.getState();
  const skills = useSkillStore.getState();
  return {
    rank: skills.currentRank,
    levels: skills.levels,
    purchasedUpgrades: skills.purchasedUpgrades,
    balances: { cognitive: currency.cognitive, capital: currency.capital, influence: currency.influence },
    earned: { cognitive: currency.totalCognitiveEarned, capital: currency.totalCapitalEarned },
  };
}

/**
 * A boolean derived from both stores. The component re-renders only when the value flips, not on
 * every 200 ms tick, so a screen can host it without paying for the game loop.
 */
function useStoreFlag(compute: (state: NextGoalState) => boolean): boolean {
  const [flag, setFlag] = useState(() => compute(readNextGoalState()));
  useEffect(() => {
    const update = () => setFlag(compute(readNextGoalState()));
    update();
    const unsubscribeCurrency = useCurrencyStore.subscribe(update);
    const unsubscribeSkills = useSkillStore.subscribe(update);
    return () => {
      unsubscribeCurrency();
      unsubscribeSkills();
    };
  }, [compute]);
  return flag;
}

const hasPurchase = (state: NextGoalState) => hasAffordablePurchase(state);

/** Dock badges (T-003): the Stack tab has something to buy, the Career tab has a promotion to claim. */
export function useDockBadges(): { skills: boolean; career: boolean } {
  const skills = useStoreFlag(hasPurchase);
  const career = useStoreFlag(canPromoteNow);
  return { skills, career };
}
