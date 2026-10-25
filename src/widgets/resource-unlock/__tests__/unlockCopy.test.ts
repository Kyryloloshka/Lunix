import en from '@shared/i18n/locales/en.json';
import es from '@shared/i18n/locales/es.json';
import uk from '@shared/i18n/locales/uk.json';
import { getResourceUnlockCopy } from '../model/unlockCopy';

const RESOURCES = ['cognitive', 'capital', 'influence'] as const;
const LOCALES = { uk, en, es };

function lookup(tree: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (
    node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined
  ), tree);
}

describe('resource unlock card copy (T-016 stage 5)', () => {
  it.each(Object.entries(LOCALES))('explains every resource in %s: title, source, use and tap mode', (_name, locale) => {
    for (const resource of RESOURCES) {
      const copy = getResourceUnlockCopy(resource);
      for (const key of [copy.titleKey, copy.sourceKey, copy.useKey, copy.modeKey]) {
        const text = lookup(locale, key);
        expect(typeof text).toBe('string');
        expect((text as string).length).toBeGreaterThan(0);
      }
    }
    for (const key of ['eyebrow', 'sourceLabel', 'useLabel', 'continue']) {
      expect(typeof lookup(locale, `resourceUnlock.${key}`)).toBe('string');
    }
    expect(lookup(locale, 'resourceUnlock.modeHint')).toEqual(expect.stringContaining('{mode}'));
    expect(lookup(locale, 'resourceUnlock.a11y')).toEqual(expect.stringContaining('{resource}'));
  });

  it('names the resource in its card title in every locale', () => {
    for (const locale of Object.values(LOCALES)) {
      for (const resource of RESOURCES) {
        const name = lookup(locale, `resources.${resource}`) as string;
        expect(lookup(locale, getResourceUnlockCopy(resource).titleKey)).toEqual(expect.stringContaining(name));
      }
    }
  });
});
