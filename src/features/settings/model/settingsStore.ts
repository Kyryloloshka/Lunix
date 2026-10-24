import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocale, setLocale as setI18nLocale, isLocale, type Locale } from '@shared/i18n';
import { setGlobalNotation } from '@shared/lib/formatters/notationContext';

export type NumberNotation = 'compact' | 'scientific';

interface SettingsValues {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  reducedMotion: boolean;
  notation: NumberNotation;
  locale: Locale;
}

interface SettingsState extends SettingsValues {
  setSoundEnabled: (value: boolean) => void;
  setHapticsEnabled: (value: boolean) => void;
  setReducedMotion: (value: boolean) => void;
  setNotation: (notation: NumberNotation) => void;
  setLocale: (locale: Locale) => void;
  load: () => Promise<void>;
}

const STORAGE_KEY = '@lunix_settings_v1';

function sanitizeValues(source: Partial<SettingsValues>): SettingsValues {
  return {
    soundEnabled: typeof source.soundEnabled === 'boolean' ? source.soundEnabled : true,
    hapticsEnabled: typeof source.hapticsEnabled === 'boolean' ? source.hapticsEnabled : true,
    reducedMotion: typeof source.reducedMotion === 'boolean' ? source.reducedMotion : false,
    notation: source.notation === 'scientific' ? 'scientific' : 'compact',
    locale: isLocale(source.locale) ? source.locale : getLocale(),
  };
}

// Set once the player changes anything, so a slow cold-boot load can't overwrite that choice.
let changedBeforeLoad = false;

async function persistValues(values: SettingsValues): Promise<void> {
  changedBeforeLoad = true;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch {
    // Fail-safe storage write
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  soundEnabled: true,
  hapticsEnabled: true,
  reducedMotion: false,
  notation: 'compact',
  locale: getLocale(),

  setSoundEnabled: (soundEnabled) => {
    set({ soundEnabled });
    const { hapticsEnabled, reducedMotion, notation, locale } = get();
    void persistValues({ soundEnabled, hapticsEnabled, reducedMotion, notation, locale });
  },
  setHapticsEnabled: (hapticsEnabled) => {
    set({ hapticsEnabled });
    const { soundEnabled, reducedMotion, notation, locale } = get();
    void persistValues({ soundEnabled, hapticsEnabled, reducedMotion, notation, locale });
  },
  setReducedMotion: (reducedMotion) => {
    set({ reducedMotion });
    const { soundEnabled, hapticsEnabled, notation, locale } = get();
    void persistValues({ soundEnabled, hapticsEnabled, reducedMotion, notation, locale });
  },
  setNotation: (notation) => {
    setGlobalNotation(notation);
    set({ notation });
    const { soundEnabled, hapticsEnabled, reducedMotion, locale } = get();
    void persistValues({ soundEnabled, hapticsEnabled, reducedMotion, notation, locale });
  },
  setLocale: (locale) => {
    setI18nLocale(locale);
    set({ locale });
    const { soundEnabled, hapticsEnabled, reducedMotion, notation } = get();
    void persistValues({ soundEnabled, hapticsEnabled, reducedMotion, notation, locale });
  },
  load: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored && !changedBeforeLoad) {
        const parsed = JSON.parse(stored) as Partial<SettingsValues>;
        const sanitized = sanitizeValues(parsed);
        setI18nLocale(sanitized.locale);
        setGlobalNotation(sanitized.notation);
        set(sanitized);
      }
    } catch {
      // safe fallback on cold boot
    }
  },
}));
