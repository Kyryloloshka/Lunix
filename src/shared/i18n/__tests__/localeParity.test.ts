import uk from '../locales/uk.json';
import en from '../locales/en.json';
import es from '../locales/es.json';

/**
 * Locale validator (T-005). English is the reference: uk and es must carry exactly the same keys and
 * the same `{placeholders}`, and no string may be empty. Registry coverage (every skill, upgrade and
 * rank has a name/description) lives in the purchase-skill content test; used-key coverage lives in
 * `src/application/__tests__/localization.test.ts`.
 *
 * Conventions (decided in T-005):
 * - keys: `<area>.<name>`; content: `skills.items.<id>.{name,desc}`, `career.ranks.<n>.{title,desc}`;
 * - registries hold ids and numbers only; every player-facing word is a key here;
 * - values identical to English are allowed only for symbols/formats/technical strings and for
 *   deliberate parody/IT terms, listed in KEEP_IDENTICAL below (anything else fails the test).
 */
type Tree = { [key: string]: unknown };

function flatten(node: Tree, prefix = '', out: Record<string, string> = {}): Record<string, string> {
  Object.entries(node).forEach(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out[path] = value;
    else if (value && typeof value === 'object') flatten(value as Tree, path, out);
    else throw new Error(`Locale value at ${path} is neither a string nor an object`);
  });
  return out;
}

const LOCALES: Record<'uk' | 'en' | 'es', Record<string, string>> = { uk: flatten(uk), en: flatten(en), es: flatten(es) };
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

/** Keys whose value may equal the English one in uk and/or es, with the reason. */
const KEEP_IDENTICAL: Record<string, string> = {
  'app.kicker': 'terminal-style header, technical',
  'app.branch': 'git branch name, technical',
  'workspace.prompt': 'shell command shown in the editor',
  'skills.lessThanPct': 'symbol',
  'skills.upgradeTier': 'format only',
  'skills.branchBoost': 'format only',
  'skills.rateLabel': 'unit format',
  'skills.upgradeFromTo': 'unit format',
  'skills.waitSeconds': 'unit format',
  'skills.waitMinutes': 'unit format',
  'skills.buyAmount': 'format only',
  'status.ratePerSec': 'unit format',
  'status.combo': 'IT loanword in es',
  'nav.skills': 'IT term "Stack" (es)',
  'resources.capital': 'same word in es',
  'career.progressBadge': 'format only',
  'career.silhouetteTitle': 'symbol',
  'career.ranks.3.title': 'IT job title, kept in uk and es',
  'career.ranks.4.title': 'IT job title, kept in uk',
  'career.ranks.5.title': 'IT job title, kept in uk',
  'career.ranks.6.title': 'IT job title, kept in uk',
  'career.ranks.7.title': 'IT job title, kept in uk',
  'career.ranks.8.title': 'IT job title, kept in uk',
  'career.ranks.9.title': 'IT job title, kept in uk',
  'leaderboard.playerRole': 'Junior → CEO, IT terms',
  'leaderboard.entries.meme-ceo.name': 'fictional parody name (es)',
  'nextGoal.progress': 'format only',
  'skills.items.typescrypt.name': 'parody brand',
  'skills.items.kubernoodles.name': 'parody brand',
  'skills.items.design-patterns.desc': 'joke class name',
  'settings.languageNames.uk': 'language names are written in their own language',
  'settings.languageNames.en': 'language names are written in their own language',
  'settings.languageNames.es': 'language names are written in their own language',
};

describe('locale files (uk / en / es)', () => {
  it('have the same key set in every locale', () => {
    const reference = Object.keys(LOCALES.en).sort();
    expect(Object.keys(LOCALES.uk).sort()).toEqual(reference);
    expect(Object.keys(LOCALES.es).sort()).toEqual(reference);
  });

  it('have no empty strings', () => {
    (Object.entries(LOCALES) as [string, Record<string, string>][]).forEach(([locale, strings]) => {
      Object.entries(strings).forEach(([key, value]) => {
        expect([locale, key, value.trim().length > 0]).toEqual([locale, key, true]);
      });
    });
  });

  it('keep the same {placeholders} for every key', () => {
    Object.entries(LOCALES.en).forEach(([key, value]) => {
      const expected = placeholders(value);
      expect([key, 'uk', placeholders(LOCALES.uk[key] ?? '')]).toEqual([key, 'uk', expected]);
      expect([key, 'es', placeholders(LOCALES.es[key] ?? '')]).toEqual([key, 'es', expected]);
    });
  });

  it('only repeat English text where that is a documented decision', () => {
    const undocumented: string[] = [];
    (['uk', 'es'] as const).forEach((locale) => {
      Object.entries(LOCALES.en).forEach(([key, value]) => {
        if (LOCALES[locale][key] === value && !(key in KEEP_IDENTICAL)) undocumented.push(`${locale}:${key}`);
      });
    });
    expect(undocumented).toEqual([]);
  });

  it('documents only keys that exist', () => {
    Object.keys(KEEP_IDENTICAL).forEach((key) => expect([key, key in LOCALES.en]).toEqual([key, true]));
  });
});
