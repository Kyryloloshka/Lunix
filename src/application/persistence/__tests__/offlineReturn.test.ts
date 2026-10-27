const mockStorage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStorage.get(key) ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      mockStorage.set(key, value);
      return Promise.resolve();
    }),
  },
}));

import { Decimal } from '@shared/lib/decimal';
import { useModalQueue } from '@shared/lib/modal-queue';
import { MAX_OFFLINE_SECONDS, useCurrencyStore } from '@entities/currency';
import { useSkillStore } from '@features/purchase-skill';
import { useOnboardingStore } from '@features/onboarding';
import { OFFLINE_REPORT_ID, showOfflineReport } from '@widgets/welcome-back';
import { loadGame, saveGame } from '../gamePersistence';

const HOUR_MS = 3_600_000;
const T0 = 1_700_000_000_000;

/** A mid-game player with passive cognitive income and some stress, saved at T0. */
async function saveProgressAt(time: number) {
  useCurrencyStore.getState().hydrate({
    capital: Decimal.from(100),
    cognitive: Decimal.from(1000),
    influence: Decimal.ZERO,
    totalCapitalEarned: Decimal.from(100),
    totalCognitiveEarned: Decimal.from(1000),
    stress: 80,
  });
  useSkillStore.getState().hydrate({ levels: { 'html-tags': 20 }, purchasedUpgrades: [], currentRank: 0, seenSkillIds: [] });
  expect(useCurrencyStore.getState().rates.cognitivePerSec.gt(0)).toBe(true);
  await saveGame(time);
}

function wipeStores() {
  useCurrencyStore.getState().reset();
  useSkillStore.getState().reset();
  useOnboardingStore.getState().reset();
}

beforeEach(() => {
  mockStorage.clear();
  wipeStores();
  useModalQueue.getState().clear();
});

describe('returning after time away (T-019)', () => {
  it('reports exactly what the balance gained, and rests the stress to 0', async () => {
    await saveProgressAt(T0);
    const before = Decimal.from(1000);
    wipeStores();

    const earnings = await loadGame(T0 + HOUR_MS);

    expect(earnings).not.toBeNull();
    const after = useCurrencyStore.getState().cognitive;
    expect(after.subtract(before).divide(earnings!.cognitive).toNumber()).toBeCloseTo(1, 9);
    expect(earnings!.seconds).toBe(3600);
    expect(earnings!.capped).toBe(false);
    expect(useCurrencyStore.getState().stress).toBe(0);
  });

  it('queues one offline report whose amounts match the earnings', async () => {
    await saveProgressAt(T0);
    wipeStores();
    const earnings = await loadGame(T0 + HOUR_MS);

    expect(showOfflineReport(earnings, useSkillStore.getState().currentRank)).toBe(true);
    const request = useModalQueue.getState().queue.find((item) => item.id === OFFLINE_REPORT_ID);
    expect(request).toBeDefined();
    expect((request!.payload as { earned: { cognitive: Decimal } }).earned.cognitive).toBe(earnings!.cognitive);
  });

  it('does not pay the same window twice (second load and re-hydrate)', async () => {
    await saveProgressAt(T0);
    wipeStores();
    await loadGame(T0 + HOUR_MS);
    const balance = useCurrencyStore.getState().cognitive;

    // The save written right after claiming carries the new timestamp.
    wipeStores();
    const second = await loadGame(T0 + HOUR_MS);
    expect(second).toBeNull();
    expect(useCurrencyStore.getState().cognitive.compareTo(balance)).toBe(0);
  });

  it('caps the time away and says so', async () => {
    await saveProgressAt(T0);
    wipeStores();
    const earnings = await loadGame(T0 + 100 * HOUR_MS);
    expect(earnings!.seconds).toBe(MAX_OFFLINE_SECONDS);
    expect(earnings!.capped).toBe(true);
  });

  it('earns nothing and queues no screen when the clock went backwards', async () => {
    await saveProgressAt(T0);
    wipeStores();
    const earnings = await loadGame(T0 - HOUR_MS);
    expect(earnings).toBeNull();
    expect(showOfflineReport(earnings, 0)).toBe(false);
    expect(useModalQueue.getState().queue).toHaveLength(0);
  });

  it('earns nothing when the save has no timestamp', async () => {
    await saveProgressAt(0);
    wipeStores();
    expect(await loadGame(T0)).toBeNull();
  });

  it('stays quiet for a short absence', async () => {
    await saveProgressAt(T0);
    wipeStores();
    const earnings = await loadGame(T0 + 30_000);
    expect(showOfflineReport(earnings, 0)).toBe(false);
    expect(useModalQueue.getState().queue).toHaveLength(0);
  });
});
