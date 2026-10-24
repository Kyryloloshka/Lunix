import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOfflineSeconds, useCurrencyStore, type OfflineEarnings } from '@entities/currency';
import { useSkillStore } from '@features/purchase-skill';
import { parseGame, serializeGame } from './saveSnapshot';

const STORAGE_KEY = '@lunix_game_v1';

export async function saveGame(now = Date.now()): Promise<void> {
  const currency = useCurrencyStore.getState();
  const skills = useSkillStore.getState();
  try {
    await AsyncStorage.setItem(STORAGE_KEY, serializeGame(currency, skills, now));
    currency.saveTimestamp();
  } catch {
    // Storage can be full or unavailable; keep playing and retry on the next autosave.
  }
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
  const earnings = useCurrencyStore.getState().applyOfflineProgress(getOfflineSeconds(save.savedAt, now));
  // Persist immediately so the same offline window can't be claimed twice.
  await saveGame(now);
  return earnings.seconds > 0 ? earnings : null;
}
