import { BRAND_MONO_FAMILY, BRAND_MONO_WEIGHTS, typography } from '@shared/theme';
import { BRAND_FONTS } from '../brandFonts';
import { isFontGateOpen } from '../useBrandFonts';

describe('brand fonts', () => {
  it('loads the family the typography tokens reference, with every token weight', () => {
    expect(BRAND_FONTS).toHaveLength(1);
    const [family] = BRAND_FONTS;
    expect(family.fontFamily).toBe(BRAND_MONO_FAMILY);
    expect(family.fontDefinitions.map((face) => face.weight)).toEqual([...BRAND_MONO_WEIGHTS]);
    for (const face of family.fontDefinitions) expect(face.path).toBeDefined();
  });

  it('points mono tokens and roles at the brand family', () => {
    expect(typography.mono).toContain(BRAND_MONO_FAMILY);
    expect(typography.display).toContain(BRAND_MONO_FAMILY);
    for (const role of [typography.roles.display, typography.roles.title, typography.roles.label, typography.roles.monoNum]) {
      expect(role.fontFamily).toContain(BRAND_MONO_FAMILY);
      expect(BRAND_MONO_WEIGHTS).toContain(Number(role.fontWeight));
    }
  });
});

describe('isFontGateOpen', () => {
  it('stays closed only while the font is still loading within the timeout', () => {
    expect(isFontGateOpen({ loaded: false, error: null, timedOut: false })).toBe(false);
  });

  it('opens when loaded, on error, or after the timeout (no blank screen)', () => {
    expect(isFontGateOpen({ loaded: true, error: null, timedOut: false })).toBe(true);
    expect(isFontGateOpen({ loaded: false, error: new Error('boom'), timedOut: false })).toBe(true);
    expect(isFontGateOpen({ loaded: false, error: null, timedOut: true })).toBe(true);
  });
});
