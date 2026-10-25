const mockStorage = new Map<string, string>();
let mockPendingGet: ((value: string | null) => void) | null = null;
let mockDeferGet = false;

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => {
      if (mockDeferGet) {
        return new Promise<string | null>((resolve) => {
          mockPendingGet = () => resolve(mockStorage.get(key) ?? null);
        });
      }
      return Promise.resolve(mockStorage.get(key) ?? null);
    }),
    setItem: jest.fn((key: string, value: string) => {
      mockStorage.set(key, value);
      return Promise.resolve();
    }),
  },
}));

const KEY = '@lunix_settings_v1';

type Store = typeof import('../model/settingsStore').useSettingsStore;

function freshStore(): Store {
  let store!: Store;
  jest.isolateModules(() => {
    store = require('../model/settingsStore').useSettingsStore;
  });
  return store;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function stored(): Record<string, unknown> {
  return JSON.parse(mockStorage.get(KEY) ?? 'null');
}

beforeEach(() => {
  mockStorage.clear();
  mockPendingGet = null;
  mockDeferGet = false;
});

describe('settings store', () => {
  it('follows the OS for reduced motion until the player chooses', async () => {
    const store = freshStore();
    await store.getState().load();
    expect(store.getState().reducedMotionChoice).toBeNull();
    expect(store.getState()).not.toHaveProperty('soundEnabled');

    store.getState().setReducedMotionChoice(false);
    expect(store.getState().reducedMotionChoice).toBe(false);
    store.getState().setReducedMotionChoice(null);
    expect(stored().reducedMotionChoice).toBeNull();
  });

  it('keeps a change made while load() is in flight', async () => {
    mockStorage.set(KEY, JSON.stringify({ version: 2, hapticsEnabled: true, reducedMotionChoice: null, notation: 'compact', locale: 'en' }));
    mockDeferGet = true;
    const store = freshStore();
    const loading = store.getState().load();

    store.getState().setHapticsEnabled(false);
    mockPendingGet?.(null);
    await loading;

    expect(store.getState().hapticsEnabled).toBe(false);
    expect(stored().hapticsEnabled).toBe(false);
  });

  // Regression: a change before the first load finished wrote defaults for every field and then
  // skipped the stored settings entirely, so the saved language and number format were lost.
  it('does not overwrite other stored fields when a setting changes before the load finishes', async () => {
    mockStorage.set(KEY, JSON.stringify({ version: 2, hapticsEnabled: true, reducedMotionChoice: true, notation: 'scientific', locale: 'es' }));
    mockDeferGet = true;
    const store = freshStore();
    const loading = store.getState().load();

    store.getState().setHapticsEnabled(false);
    // Nothing is written before the stored settings were read.
    expect(stored()).toMatchObject({ locale: 'es', notation: 'scientific' });

    mockPendingGet?.(null);
    await loading;

    expect(store.getState()).toMatchObject({
      hapticsEnabled: false,
      reducedMotionChoice: true,
      notation: 'scientific',
      locale: 'es',
    });
    expect(stored()).toMatchObject({ hapticsEnabled: false, reducedMotionChoice: true, notation: 'scientific', locale: 'es' });
  });

  // Regression: SettingsPanel called load() every time the tab opened.
  it('a repeated load() never reverts a value changed after the first load', async () => {
    mockStorage.set(KEY, JSON.stringify({ version: 2, hapticsEnabled: true, reducedMotionChoice: null, notation: 'compact', locale: 'en' }));
    const store = freshStore();
    await store.getState().load();

    store.getState().setReducedMotionChoice(true);
    store.getState().setNotation('scientific');
    // Simulate the stored value lagging behind (e.g. a write still in flight).
    mockStorage.set(KEY, JSON.stringify({ version: 2, hapticsEnabled: true, reducedMotionChoice: null, notation: 'compact', locale: 'en' }));
    await store.getState().load();
    await flush();

    expect(store.getState().reducedMotionChoice).toBe(true);
    expect(store.getState().notation).toBe('scientific');
  });

  it('migrates stored v1 settings and rewrites them in the v2 shape', async () => {
    mockStorage.set(KEY, JSON.stringify({ soundEnabled: true, hapticsEnabled: false, reducedMotion: false, notation: 'compact', locale: 'uk' }));
    const store = freshStore();
    await store.getState().load();

    expect(store.getState()).toMatchObject({ hapticsEnabled: false, reducedMotionChoice: null, locale: 'uk' });
    expect(stored()).toEqual({ version: 2, hapticsEnabled: false, reducedMotionChoice: null, notation: 'compact', locale: 'uk' });
  });

  it('starts from defaults when stored settings are corrupt', async () => {
    mockStorage.set(KEY, '{broken');
    const store = freshStore();
    await expect(store.getState().load()).resolves.toBeUndefined();
    expect(store.getState().hapticsEnabled).toBe(true);
    expect(store.getState().reducedMotionChoice).toBeNull();
  });
});
