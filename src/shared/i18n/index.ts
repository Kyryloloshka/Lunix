import { useSyncExternalStore } from 'react';
import uk from './locales/uk.json';
import en from './locales/en.json';
import es from './locales/es.json';
import { getEnglishPluralCategory, getUkrainianPluralCategory } from '../lib/i18n/pluralize';

export type Locale = 'uk' | 'en' | 'es';

export function isLocale(value: unknown): value is Locale {
  return value === 'uk' || value === 'en' || value === 'es';
}

type TranslationTree = Record<string, unknown>;

const translations: Record<Locale, TranslationTree> = {
  uk,
  en,
  es,
};

let currentLocale: Locale = 'uk';
const localeListeners = new Set<() => void>();

export function setLocale(locale: Locale) {
  if (!isLocale(locale) || locale === currentLocale) return;
  currentLocale = locale;
  localeListeners.forEach((listener) => listener());
}

export function getLocale(): Locale {
  return currentLocale;
}

export function useLocale(): Locale {
  return useSyncExternalStore(
    (listener) => {
      localeListeners.add(listener);
      return () => localeListeners.delete(listener);
    },
    getLocale,
    getLocale,
  );
}

/**
 * Access nested translation string by dot notation, e.g. "skills.items.react.name"
 * Supports parameter interpolation: {amount}, {level}, etc.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const tree = translations[currentLocale] || translations.uk;
  const parts = key.split('.');
  let current: unknown = tree;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      // Fallback to uk
      let fallback: unknown = translations.uk;
      for (const p of parts) {
        if (fallback && typeof fallback === 'object' && p in (fallback as Record<string, unknown>)) {
          fallback = (fallback as Record<string, unknown>)[p];
        } else {
          return key;
        }
      }
      current = fallback;
      break;
    }
  }

  if (typeof current !== 'string') {
    return key;
  }

  if (!params) return current;

  return current.replace(/\{(\w+)\}/g, (_, p) => {
    return p in params ? String(params[p]) : `{${p}}`;
  });
}

/**
 * Plural translation helper.
 */
export function tPlural(
  count: number,
  forms: { one: string; few?: string; many: string; other?: string },
): string {
  const category = currentLocale === 'uk'
    ? getUkrainianPluralCategory(count)
    : getEnglishPluralCategory(count); // Spanish uses the same singular/plural categories as English.

  return (forms as Record<string, string>)[category] || forms.many || forms.one;
}
