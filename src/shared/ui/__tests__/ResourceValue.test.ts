import { resources, type ResourceKind } from '@shared/theme';
import { glyphSymbols } from '../DevGlyph';
import { getResourceValueParts } from '../ResourceValue';

// Characters that render as color emoji by default (⚡, 🧠). Text-default symbols such as ↗ are fine.
const EMOJI = /\p{Emoji_Presentation}/u;

describe('getResourceValueParts', () => {
  it('draws the token glyph and color after non-capital amounts', () => {
    for (const kind of ['cognitive', 'influence'] as const) {
      const parts = getResourceValueParts(kind, '50.00K', 'Label');
      expect(parts.text).toBe('50.00K');
      expect(parts.glyph).toBe(glyphSymbols[resources[kind].glyph]);
      expect(parts.glyphColor).toBe(resources[kind].color);
    }
  });

  it('keeps `$` as the capital unit and adds no glyph', () => {
    const parts = getResourceValueParts('capital', '$1.00K', 'Capital');
    expect(parts.glyph).toBeNull();
    expect(parts.text).toBe('$1.00K');
  });

  it('names the resource for screen readers', () => {
    expect(getResourceValueParts('cognitive', '12', 'Cognitive').accessibilityLabel).toBe('12 Cognitive');
  });

  it('never uses emoji glyphs for formatted resources', () => {
    const kinds: ResourceKind[] = ['capital', 'cognitive', 'influence'];
    for (const kind of kinds) {
      const parts = getResourceValueParts(kind, '1', 'x');
      expect(parts.glyph ?? '').not.toMatch(EMOJI);
    }
  });
});
