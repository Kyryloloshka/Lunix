import { isLocale, type Locale } from '@shared/i18n';

export type NumberNotation = 'compact' | 'scientific';

/**
 * v2 (T-006): the dead `soundEnabled` flag is gone (the game has no sound yet), and reduced motion is
 * a tri-state choice: `null` follows the OS setting, `true`/`false` is the player's explicit choice.
 */
export const SETTINGS_VERSION = 2;

export interface SettingsValues {
  hapticsEnabled: boolean;
  /** `null` = follow the OS "reduce motion" setting; a boolean is the player's explicit choice. */
  reducedMotionChoice: boolean | null;
  notation: NumberNotation;
  locale: Locale;
}

export function createDefaultSettings(locale: Locale): SettingsValues {
  return { hapticsEnabled: true, reducedMotionChoice: null, notation: 'compact', locale };
}

export function serializeSettings(values: SettingsValues): string {
  return JSON.stringify({ version: SETTINGS_VERSION, ...values });
}

function parseNotation(value: unknown): NumberNotation {
  return value === 'scientific' ? 'scientific' : 'compact';
}

/**
 * Parses stored settings, migrating v1 (no `version` field). Returns null for missing, corrupt or
 * unknown-version data so the caller keeps its defaults. Every field is validated separately.
 */
export function parseStoredSettings(raw: string | null, fallbackLocale: Locale): SettingsValues | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const source = data as Record<string, unknown>;

  const base = {
    hapticsEnabled: typeof source.hapticsEnabled === 'boolean' ? source.hapticsEnabled : true,
    notation: parseNotation(source.notation),
    locale: isLocale(source.locale) ? source.locale : fallbackLocale,
  };

  if (source.version === undefined) {
    // v1 stored every field on any change and defaulted reducedMotion to false, so only `true` is a
    // real choice; `false` becomes "follow the OS". `soundEnabled` is dropped.
    return { ...base, reducedMotionChoice: source.reducedMotion === true ? true : null };
  }
  if (source.version === SETTINGS_VERSION) {
    const choice = source.reducedMotionChoice;
    return { ...base, reducedMotionChoice: typeof choice === 'boolean' ? choice : null };
  }
  return null;
}
