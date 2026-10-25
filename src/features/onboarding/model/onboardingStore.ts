import { create } from 'zustand';
import {
  advanceOnboarding,
  COMPLETED_ONBOARDING,
  FRESH_ONBOARDING,
  type OnboardingProgress,
  type OnboardingSignals,
  type OnboardingSnapshot,
} from './onboardingSteps';

interface OnboardingState extends OnboardingProgress {
  /** The intro was opened again from settings. Session state, never saved. */
  replayingIntro: boolean;
  /** Intro finished or skipped. Also ends a replay. */
  completeIntro: () => void;
  replayIntro: () => void;
  dismissStressHint: () => void;
  /** Feeds live game values in; marks the steps the player has completed by playing. */
  sync: (signals: OnboardingSignals) => void;
  hydrate: (snapshot: OnboardingSnapshot) => void;
  reset: () => void;
}

const freshState = () => ({ ...FRESH_ONBOARDING, stressHintOpen: false, replayingIntro: false });

export function toSnapshot(state: OnboardingSnapshot): OnboardingSnapshot {
  return {
    introDone: state.introDone,
    tapDone: state.tapDone,
    buyDone: state.buyDone,
    stressDone: state.stressDone,
  };
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  ...freshState(),
  completeIntro: () => set({ introDone: true, replayingIntro: false }),
  replayIntro: () => set({ replayingIntro: true }),
  dismissStressHint: () => set({ stressDone: true, stressHintOpen: false }),
  sync: (signals) => {
    const current = get();
    const next = advanceOnboarding(current, signals);
    if (next !== current) {
      const { tapDone, buyDone, stressDone, stressHintOpen } = next;
      set({ tapDone, buyDone, stressDone, stressHintOpen });
    }
  },
  hydrate: (snapshot) => set({
    ...toSnapshot({ ...COMPLETED_ONBOARDING, ...snapshot }),
    stressHintOpen: false,
    replayingIntro: false,
  }),
  reset: () => set(freshState()),
}));
