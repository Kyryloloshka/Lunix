import { contrastRatio, parseHexColor, relativeLuminance } from '../contrast';

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for identical colors', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#123456', '#123456')).toBeCloseTo(1, 5);
  });

  it('does not depend on argument order', () => {
    expect(contrastRatio('#e6e8e6', '#111416')).toBeCloseTo(contrastRatio('#111416', '#e6e8e6'), 10);
  });

  it('matches known WCAG values', () => {
    // #767676 on white is the classic 4.54:1 grey.
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });

  it('accepts short hex and is case-insensitive', () => {
    expect(parseHexColor('#FfF')).toEqual([255, 255, 255]);
    expect(relativeLuminance('#000')).toBe(0);
  });

  it('rejects anything that is not a hex color', () => {
    expect(() => parseHexColor('rgba(0,0,0,1)')).toThrow();
    expect(() => parseHexColor('#12345')).toThrow();
    expect(() => parseHexColor('')).toThrow();
  });
});
