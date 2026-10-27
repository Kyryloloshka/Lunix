import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getOfflineSeconds, useCurrencyStore } from '@entities/currency';
import { toSnapshot, useOnboardingStore } from '@features/onboarding';
import { useSkillStore } from '@features/purchase-skill';
import { showOfflineReport } from '@widgets/welcome-back';
import { loadGame, saveGame } from './gamePersistence';

const AUTOSAVE_INTERVAL_MS = 10_000;

/**
 * Loads the save before the game is shown, autosaves while playing, saves on background
 * and grants the time spent in background on return. Returns true once the save is loaded.
 */
export function useGamePersistence(): boolean {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let backgroundedAt: number | null = null;
    // Never write before the save is read, or a fresh state would overwrite real progress.
    let canSave = false;

    void loadGame().then((earnings) => {
      // The grant is already applied and saved; the queue only tells the player about it.
      showOfflineReport(earnings, useSkillStore.getState().currentRank);
    }).finally(() => {
      canSave = true;
      if (!cancelled) setIsLoaded(true);
    });

    const autosave = setInterval(() => {
      if (canSave) void saveGame();
    }, AUTOSAVE_INTERVAL_MS);

    // Onboarding steps change rarely and the player expects them to stick (a skipped intro must not come
    // back after a quick restart), so they are saved right away instead of waiting for the next autosave.
    let lastOnboarding = JSON.stringify(toSnapshot(useOnboardingStore.getState()));
    const unsubscribeOnboarding = useOnboardingStore.subscribe((state) => {
      const next = JSON.stringify(toSnapshot(state));
      if (next === lastOnboarding) return;
      lastOnboarding = next;
      if (canSave) void saveGame();
    });

    const subscription = AppState.addEventListener('change', (state) => {
      if (!canSave) return;
      if (state === 'active') {
        if (backgroundedAt !== null) {
          const earnings = useCurrencyStore.getState().applyOfflineProgress(getOfflineSeconds(backgroundedAt, Date.now()));
          backgroundedAt = null;
          void saveGame();
          showOfflineReport(earnings, useSkillStore.getState().currentRank);
        }
        return;
      }
      if (backgroundedAt === null) {
        backgroundedAt = Date.now();
        void saveGame(backgroundedAt);
      }
    });

    return () => {
      cancelled = true;
      clearInterval(autosave);
      subscription.remove();
      unsubscribeOnboarding();
    };
  }, []);

  return isLoaded;
}
