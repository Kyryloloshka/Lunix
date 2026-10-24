import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getOfflineSeconds, useCurrencyStore } from '@entities/currency';
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

    void loadGame().finally(() => {
      canSave = true;
      if (!cancelled) setIsLoaded(true);
    });

    const autosave = setInterval(() => {
      if (canSave) void saveGame();
    }, AUTOSAVE_INTERVAL_MS);

    const subscription = AppState.addEventListener('change', (state) => {
      if (!canSave) return;
      if (state === 'active') {
        if (backgroundedAt !== null) {
          useCurrencyStore.getState().applyOfflineProgress(getOfflineSeconds(backgroundedAt, Date.now()));
          backgroundedAt = null;
          void saveGame();
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
    };
  }, []);

  return isLoaded;
}
