import uk from '../locales/uk.json';

/**
 * Ukrainian style rules (T-027, see docs/design-system.md "Ukrainian copy"):
 * - a resource name (nominative only: "Когнітивка", "Капітал") never follows a number or a verb that
 *   needs another case; such templates put a colon before the amount: "Бракує: 250 ◈ Когнітивка";
 * - tap hints use one imperative: "Тапай" for the repeated tap, "Тапни" only for a one-off continue.
 */
type Tree = { [key: string]: unknown };

function flatten(node: Tree, prefix = '', out: Record<string, string> = {}): Record<string, string> {
  Object.entries(node).forEach(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out[path] = value;
    else if (value && typeof value === 'object') flatten(value as Tree, path, out);
  });
  return out;
}

const flat = flatten(uk as Tree);

describe('uk style', () => {
  it('does not place {resource} right after {amount}/{cost}/{have} unless introduced by a colon', () => {
    const offenders = Object.entries(flat).filter(
      ([, v]) => /\{(amount|cost|have)\}\s+\{resource\}/.test(v) && !/:\s*\{amount\}\s+\{resource\}/.test(v),
    );
    expect(offenders).toEqual([]);
  });

  it('uses colon-form for missing-resource templates', () => {
    expect(flat['career.missingResource']).toMatch(/^Бракує: \{amount\} \{resource\}/);
    expect(flat['skills.needMoreA11y']).toMatch(/^Бракує: \{amount\} \{resource\}/);
  });

  it('does not use a case-governing verb directly before {resource}', () => {
    const offenders = Object.entries(flat).filter(([, v]) => /(Заробити|Накопичити|Витратити|Зібрати)\s+\{resource\}/.test(v));
    expect(offenders).toEqual([]);
  });

  it('uses "Тапни" only for the one-off continue prompt', () => {
    const tapni = Object.entries(flat).filter(([, v]) => /Тапни/.test(v)).map(([k]) => k);
    expect(tapni).toEqual(['onboarding.intro.next']);
  });
});
