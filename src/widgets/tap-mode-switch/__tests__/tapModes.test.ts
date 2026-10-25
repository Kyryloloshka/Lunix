import { RESOURCE_UNLOCK_RANK } from '@entities/career-rank';
import en from '@shared/i18n/locales/en.json';
import es from '@shared/i18n/locales/es.json';
import uk from '@shared/i18n/locales/uk.json';
import { TAP_MODE_LABEL_KEY, getTapModeOptions, shouldShowTapModeSwitch } from '../model/tapModes';

function lookup(tree: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (
    node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined
  ), tree);
}

describe('tap-mode switch (T-016 stage 5)', () => {
  it('stays hidden while studying and appears with the first salary', () => {
    for (let rank = 0; rank < RESOURCE_UNLOCK_RANK.capital; rank += 1) {
      expect(shouldShowTapModeSwitch(rank)).toBe(false);
    }
    expect(shouldShowTapModeSwitch(RESOURCE_UNLOCK_RANK.capital)).toBe(true);
  });

  it('offers one mode per unlocked resource and never a locked one', () => {
    expect(getTapModeOptions(0, 'cognitive').map((option) => option.resource)).toEqual(['cognitive']);
    expect(getTapModeOptions(3, 'capital').map((option) => option.resource)).toEqual(['cognitive', 'capital']);
    expect(getTapModeOptions(5, 'capital').map((option) => option.resource)).toEqual(['cognitive', 'capital', 'influence']);
  });

  it('marks exactly the active mode as selected', () => {
    const options = getTapModeOptions(5, 'capital');
    expect(options.filter((option) => option.selected).map((option) => option.resource)).toEqual(['capital']);
  });

  it('has a mode name in every locale', () => {
    for (const locale of [uk, en, es]) {
      for (const key of Object.values(TAP_MODE_LABEL_KEY)) {
        expect(typeof lookup(locale, key)).toBe('string');
      }
      expect(typeof lookup(locale, 'tapMode.label')).toBe('string');
      expect(lookup(locale, 'tapMode.modeA11y')).toEqual(expect.stringContaining('{mode}'));
    }
  });
});
