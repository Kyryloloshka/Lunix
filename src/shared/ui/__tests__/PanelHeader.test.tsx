import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import { PanelHeader } from '../PanelHeader';
import { CONTENT_MAX_WIDTH, MIN_TOUCH_TARGET } from '../layout';

type AnyElement = ReactElement<{ style?: unknown; children?: ReactNode; numberOfLines?: number }>;

function childElements(element: AnyElement): AnyElement[] {
  return Children.toArray(element.props.children).filter(isValidElement) as AnyElement[];
}

function flat(element: AnyElement) {
  return StyleSheet.flatten(element.props.style as never) ?? {};
}

// PanelHeader has no hooks, so calling it returns its element tree without a renderer.
function renderHeader(props: Parameters<typeof PanelHeader>[0]): AnyElement {
  return PanelHeader(props) as AnyElement;
}

describe('PanelHeader (T-002: long titles must not be clipped or push the badge off screen)', () => {
  const longTitle = 'Від самоучки до лідера великої технологічної компанії';

  it('puts the badge next to the eyebrow, in a slot that never shrinks', () => {
    const root = renderHeader({ eyebrow: 'КАР\'ЄРА', title: longTitle, trailing: 'badge' });
    const [topRow] = childElements(root);
    expect(flat(topRow)).toMatchObject({ flexDirection: 'row' });

    const [eyebrowSlot, trailing] = childElements(topRow);
    expect(flat(eyebrowSlot)).toMatchObject({ flex: 1, minWidth: 0 });
    expect(trailing).toBeDefined();
    expect(flat(trailing)).toMatchObject({ flexShrink: 0 });
  });

  it('renders the title on its own full-width line and lets it wrap without truncation', () => {
    const root = renderHeader({ eyebrow: 'КАР\'ЄРА', title: longTitle, trailing: 'badge' });
    const title = childElements(root).find((child) => child.type === Text);
    expect(title?.props.children).toBe(longTitle);
    expect(title?.props.numberOfLines).toBeUndefined();
    expect(flat(title as AnyElement)).not.toHaveProperty('flexShrink', 0);
  });

  it('renders only the title when there is no eyebrow or badge', () => {
    const root = renderHeader({ title: 'Short' });
    const children = childElements(root);
    expect(children).toHaveLength(1);
    expect(children[0].type).toBe(Text);
  });
});

describe('layout limits', () => {
  it('keeps touch targets at least 44pt and the content column readable', () => {
    expect(MIN_TOUCH_TARGET).toBeGreaterThanOrEqual(44);
    expect(CONTENT_MAX_WIDTH).toBeGreaterThanOrEqual(430);
    expect(CONTENT_MAX_WIDTH).toBeLessThanOrEqual(600);
  });
});
