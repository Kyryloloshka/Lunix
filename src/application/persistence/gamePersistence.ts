import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOfflineSeconds, useCurrencyStore, type OfflineEarnings } from '@entities/currency';
import { useSkillStore } from '@features/purchase-skill';
import { toSnapshot, useOnboardingStore } from '@features/onboarding';
import { parseGame, serializeGame } from './saveSnapshot';

const STORAGE_KEY = '@lunix_game_v1';

// Every write goes through one queue, so a slow autosave that already serialized the old progress
// can never land after a reset (or any newer save) and bring that progress back.
let writeQueue: Promise<void> = Promise.resolve();

function enqueueWrite(task: () => Promise<void>): Promise<void> {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => undefined);
  return run;
}

/** Serializes the stores at the moment the write runs, not when it was requested. */
async function writeSnapshot(now: number): Promise<void> {
  const currency = useCurrencyStore.getState();
  const skills = useSkillStore.getState();
  try {
    await AsyncStorage.setItem(STORAGE_KEY, serializeGame(currency, skills, toSnapshot(useOnboardingStore.getState()), now));
    currency.saveTimestamp();
  } catch {
    // Storage can be full or unavailable; keep playing and retry on the next autosave.
  }
}

export function saveGame(now = Date.now()): Promise<void> {
  return enqueueWrite(() => writeSnapshot(now));
}

/**
 * Starts the career over: resets every game store and immediately stores the fresh state as the save.
 * Runs in the write queue after any save already in flight, so autosave can't restore old progress.
 */
export function resetProgress(now = Date.now()): Promise<void> {
  return enqueueWrite(async () => {
    useCurrencyStore.getState().reset();
    // Resetting skills also recomputes rates from the empty skill set.
    useSkillStore.getState().reset();
    useOnboardingStore.getState().reset();
    await writeSnapshot(now);
  });
}

/** Restore the save and grant offline earnings once. Returns null when there was nothing to claim. */
export async function loadGame(now = Date.now()): Promise<OfflineEarnings | null> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  const save = parseGame(raw);
  if (!save) return null;

  useCurrencyStore.getState().hydrate(save.currency);
  // Hydrating skills also recomputes rates, which offline earnings depend on.
  useSkillStore.getState().hydrate(save.skills);
  useOnboardingStore.getState().hydrate(save.onboarding);
  const earnings = useCurrencyStore.getState().applyOfflineProgress(getOfflineSeconds(save.savedAt, now));
  // Persist immediately so the same offline window can't be claimed twice.
  await saveGame(now);
  return earnings.seconds > 0 ? earnings : null;
}
