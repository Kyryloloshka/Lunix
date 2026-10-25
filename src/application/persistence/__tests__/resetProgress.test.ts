const mockStorage = new Map<string, string>();
/** When set, the next setItem waits until the test releases it (a slow write in flight). */
let mockHoldNextWrite = false;
let mockReleaseWrite: (() => void) | null = null;

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStorage.get(key) ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      if (mockHoldNextWrite) {
        mockHoldNextWrite = false;
        return new Promise<void>((resolve) => {
          mockReleaseWrite = () => {
            mockStorage.set(key, value);
            resolve();
          };
        });
      }
      mockStorage.set(key, value);
      return Promise.resolve();
    }),
  },
}));

import { Decimal } from '@shared/lib/decimal';
import { useCurrencyStore } from '@entities/currency';
import { useSkillStore } from '@features/purchase-skill';
import { resetProgress, saveGame } from '../gamePersistence';
import { parseGame } from '../saveSnapshot';

const KEY = '@lunix_game_v1';

function storedSave() {
  return parseGame(mockStorage.get(KEY) ?? null);
}

function playForAWhile() {
  useCurrencyStore.getState().hydrate({
    capital: new Decimal(5, 400),
    cognitive: Decimal.from(1234),
    influence: Decimal.from(56),
    totalCapitalEarned: new Decimal(6, 400),
    totalCognitiveEarned: Decimal.from(9999),
    stress: 70,
  });
  useSkillStore.getState().hydrate({ levels: {}, purchasedUpgrades: [], currentRank: 4 });
}

beforeEach(() => {
  mockStorage.clear();
  mockHoldNextWrite = false;
  mockReleaseWrite = null;
  useCurrencyStore.getState().reset();
  useSkillStore.getState().reset();
});

describe('resetProgress', () => {
  it('resets every store and stores the fresh state as the save', async () => {
    playForAWhile();
    await saveGame(1000);
    expect(storedSave()?.skills.currentRank).toBe(4);

    await resetProgress(2000);

    expect(useSkillStore.getState().currentRank).toBe(0);
    expect(useCurrencyStore.getState().capital.isZero()).toBe(true);
    expect(useCurrencyStore.getState().stress).toBe(0);
    const save = storedSave();
    expect(save?.savedAt).toBe(2000);
    expect(save?.skills.currentRank).toBe(0);
    expect(save?.currency.capital.isZero()).toBe(true);
    expect(save?.currency.totalCapitalEarned.isZero()).toBe(true);
  });

  it('an autosave after the reset keeps the fresh state', async () => {
    playForAWhile();
    await saveGame(1000);
    await resetProgress(2000);
    await saveGame(3000);

    const save = storedSave();
    expect(save?.savedAt).toBe(3000);
    expect(save?.skills.currentRank).toBe(0);
    expect(save?.currency.capital.isZero()).toBe(true);
  });

  it('a slow autosave already in flight cannot bring the old progress back', async () => {
    playForAWhile();
    mockHoldNextWrite = true;
    // Autosave serializes the old progress, then its write stalls.
    const slowAutosave = saveGame(1000);
    await Promise.resolve();

    const reset = resetProgress(2000);
    // Let the stalled write finish only after the reset was requested.
    for (let i = 0; i < 5 && !mockReleaseWrite; i += 1) await Promise.resolve();
    mockReleaseWrite?.();
    await Promise.all([slowAutosave, reset]);

    const save = storedSave();
    expect(save?.savedAt).toBe(2000);
    expect(save?.skills.currentRank).toBe(0);
    expect(save?.currency.capital.isZero()).toBe(true);
    expect(useSkillStore.getState().currentRank).toBe(0);
  });
});
