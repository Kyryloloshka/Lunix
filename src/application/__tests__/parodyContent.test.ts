import { SKILLS, UPGRADES } from '@entities/skill';
import { NPC_LEADERS } from '@widgets/simulated-leaderboard';
import en from '@shared/i18n/locales/en.json';
import uk from '@shared/i18n/locales/uk.json';
import es from '@shared/i18n/locales/es.json';

/**
 * Content is parody (.agents/rules/product.md): no real people, no real brands verbatim.
 * Generic tech terms (HTML, CSS, JavaScript, Git, Rust, SaaS, ML) are fine; brands get a parody
 * name that still reads as the original (Reakt, Nodle, Dokker, Gooble, Macrosoft).
 */
const FORBIDDEN = [
  // Real people
  'Sundar', 'Pichai', 'Satya', 'Nadella', 'Elon', 'Musk', 'Zuckerberg', 'Bezos', 'Steve Jobs', 'Bill Gates', 'Altman',
  'Сундар', 'Пічаї', 'Сатья', 'Наделла', 'Ілон', 'Маск', 'Цукерберг', 'Безос', 'Гейтс',
  // Companies and products
  'Google', 'Alphabet', 'Microsoft', 'Apple', 'Amazon', 'Facebook', 'Netflix', 'FAANG', 'MAANG',
  'YouTube', 'Stack Overflow', 'StackOverflow', 'GitHub', 'OpenAI', 'ChatGPT', 'Vercel',
  'Гугл', 'Майкрософт', 'Ютуб', 'Ютубу', 'Гітхаб',
  // Trademarked technologies
  'React', 'Kubernetes', 'Docker', 'Tailwind', 'Turbofan', 'V8', 'Node.js', 'TypeScript',
];

/**
 * Temporary exceptions: locale path → why it is still allowed. Each entry must point at the task that
 * renames it (T-016 owns skill and upgrade content). Empty since T-016 stage 2 renamed the registries.
 */
const ALLOWLIST: Record<string, string> = {};

const pattern = new RegExp(
  `(?<![\\p{L}\\p{N}])(${FORBIDDEN.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\p{L}\\p{N}])`,
  'iu',
);

function findForbidden(text: string): string | undefined {
  return pattern.exec(text)?.[1];
}

type Tree = { [key: string]: unknown };

/** Every key and string value of a locale as [path, text] pairs; keys are checked too (they mirror ids). */
function flatten(tree: Tree, prefix = ''): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]): [string, string][] => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') return [[path, key], ...flatten(value as Tree, path)];
    return [[path, key], [path, String(value)]];
  });
}

const LOCALES = { en, uk, es } as Record<string, Tree>;

describe('parody content guard', () => {
  it('detects real names and brands, but not their parodies', () => {
    expect(findForbidden('Sundar Pichai, Google CEO')).toBe('Sundar');
    expect(findForbidden('Сатья Наделла')).toBe('Сатья');
    expect(findForbidden('Docker & Kubernetes')).toBe('Docker');
    expect(findForbidden('HTML-теги з ютубу')).toBe('ютубу');
    expect(findForbidden('Gooble CEO, Reakt, Dokker, Nodle, Macrosoft, MAANGO')).toBeUndefined();
    expect(findForbidden('Centering a Div with CSS and JavaScript')).toBeUndefined();
  });

  it.each(Object.keys(LOCALES))('keeps real people and brands out of the %s locale', (locale) => {
    const hits = flatten(LOCALES[locale])
      .filter(([path]) => !(path in ALLOWLIST))
      .map(([path, text]) => [path, text, findForbidden(text)])
      .filter(([, , term]) => term);
    expect(hits).toEqual([]);
  });

  it('keeps real people and brands out of registry ids', () => {
    const ids = [...SKILLS.map((skill) => skill.id), ...UPGRADES.map((upgrade) => upgrade.id), ...NPC_LEADERS.map((npc) => npc.id)];
    expect(ids.filter((id) => findForbidden(id.replace(/-/g, ' ')))).toEqual([]);
  });

  it('only allowlists entries that still need it and names the task that renames them', () => {
    Object.entries(ALLOWLIST).forEach(([path, reason]) => {
      expect(reason).toMatch(/T-\d{3}/);
      const texts = Object.values(LOCALES).flatMap((tree) => flatten(tree).filter(([key]) => key === path).map(([, text]) => text));
      expect(texts.some((text) => findForbidden(text))).toBe(true);
    });
  });
});
