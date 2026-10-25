import { useCurrencyStore } from '@entities/currency';
import { getFirstSkillCost, getGuideStage, useOnboardingStore, type GuideStage } from '@features/onboarding';

/** Current guide stage. The affordability selector is a boolean, so the hint re-renders only when it flips. */
export function useGuideStage(): GuideStage {
  const introDone = useOnboardingStore((state) => state.introDone);
  const replaying = useOnboardingStore((state) => state.replayingIntro);
  const tapDone = useOnboardingStore((state) => state.tapDone);
  const buyDone = useOnboardingStore((state) => state.buyDone);
  const stressDone = useOnboardingStore((state) => state.stressDone);
  const canAfford = useCurrencyStore((state) => state.cognitive.gte(getFirstSkillCost()));
  if (replaying) return null;
  return getGuideStage({ introDone, tapDone, buyDone, stressDone }, canAfford);
}
