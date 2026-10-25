import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocale, setLocale as setI18nLocale, type Locale } from '@shared/i18n';
import { setGlobalNotation } from '@shared/lib/formatters/notationContext';
import {
  createDefaultSettings,
  parseStoredSettings,
  serializeSettings,
  type NumberNotation,
  type SettingsValues,
} from './settingsSnapshot';

interface SettingsState extends SettingsValues {
  setHapticsEnabled: (value: boolean) => void;
  /** `null` goes back to following the OS setting. */
  setReducedMotionChoice: (value: boolean | null) => void;
  setNotation: (notation: NumberNotation) => void;
  setLocale: (locale: Locale) => void;
  /** Reads stored settings once. Repeated calls share the same load and never revert later changes. */
  load: () => Promise<void>;
}

// Kept for compatibility: v1 settings live under this key and are migrated in place.
const STORAGE_KEY = '@lunix_settings_v1';

type SettingKey = keyof SettingsValues;

/** Fields the player changed in this session. A load never overwrites them. */
const changedKeys = new Set<SettingKey>();
let isLoaded = false;
let loadPromise: Promise<void> | null = null;

function pickValues(state: SettingsValues): SettingsValues {
  const { hapticsEnabled, reducedMotionChoice, notation, locale } = state;
  return { hapticsEnabled, reducedMotionChoice, notation, locale };
}

async function persistValues(values: SettingsValues): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, serializeSettings(values));
  } catch {
    // Fail-safe storage write
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const change = <K extends SettingKey>(key: K, value: SettingsValues[K]) => {
    changedKeys.add(key);
    set({ [key]: value } as Pick<SettingsValues, K>);
    // Never write before the stored settings were read: that would replace the other stored fields
    // with defaults. The load persists the merged result instead.
    if (isLoaded) void persistValues(pickValues(get()));
  };

  return {
    ...createDefaultSettings(getLocale()),

    setHapticsEnabled: (value) => change('hapticsEnabled', value),
    setReducedMotionChoice: (value) => change('reducedMotionChoice', value),
    setNotation: (notation) => {
      setGlobalNotation(notation);
      change('notation', notation);
    },
    setLocale: (locale) => {
      setI18nLocale(locale);
      change('locale', locale);
    },
    load: () => {
      if (isLoaded) return Promise.resolve();
      if (loadPromise) return loadPromise;
      loadPromise = (async () => {
        let raw: string | null = null;
        try {
          raw = await AsyncStorage.getItem(STORAGE_KEY);
        } catch {
          // Unreadable storage: keep defaults.
        }
        const stored = parseStoredSettings(raw, get().locale);
        if (stored) {
          // Whatever the player changed while the load was in flight wins over the stored value.
          const merged: SettingsValues = { ...stored };
          const current = pickValues(get());
          for (const key of changedKeys) {
            (merged as unknown as Record<SettingKey, unknown>)[key] = current[key];
          }
          setI18nLocale(merged.locale);
          setGlobalNotation(merged.notation);
          set(merged);
        }
        isLoaded = true;
        // Writes the migrated shape (v1 → v2) and any change made before the load finished.
        const values = pickValues(get());
        if (changedKeys.size > 0 || (stored !== null && serializeSettings(values) !== raw)) {
          await persistValues(values);
        }
      })();
      return loadPromise;
    },
  };
});
