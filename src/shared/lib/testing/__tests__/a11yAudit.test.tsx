import { Pressable, Text } from 'react-native';
import { screen } from '@testing-library/react-native';
import { auditTouchables, countTouchables } from '../a11yAudit';
import { renderWithProviders } from '../renderWithProviders';

const noop = () => undefined;

// The audit is what keeps unlabeled controls out of the app, so it must itself be proven to catch them.
describe('auditTouchables', () => {
  it('accepts controls with a role and a label, and tabs that expose selected', async () => {
    await renderWithProviders(
      <>
        <Pressable accessibilityRole="button" accessibilityLabel="Buy" onPress={noop} />
        <Pressable accessibilityRole="button" onPress={noop}><Text>MAX</Text></Pressable>
        <Pressable accessibilityRole="tab" accessibilityLabel="Stack" accessibilityState={{ selected: false }} onPress={noop} />
      </>,
    );

    expect(countTouchables(screen.root!)).toBe(3);
    expect(auditTouchables(screen.root!)).toEqual([]);
  });

  it('fails for an icon-only button without a label', async () => {
    await renderWithProviders(<Pressable accessibilityRole="button" onPress={noop} />);

    expect(auditTouchables(screen.root!).map((v) => v.problem)).toEqual([
      'missing accessibilityLabel (and no visible text)',
    ]);
  });

  it('fails for a button without a role', async () => {
    await renderWithProviders(<Pressable accessibilityLabel="Buy" onPress={noop} />);

    expect(auditTouchables(screen.root!).map((v) => v.problem)).toEqual(['missing accessibilityRole']);
  });

  it('fails for a tab that does not expose selected', async () => {
    await renderWithProviders(<Pressable accessibilityRole="tab" accessibilityLabel="Stack" onPress={noop} />);

    expect(auditTouchables(screen.root!).map((v) => v.problem)).toEqual(['tab without accessibilityState.selected']);
  });

  it('ignores non-interactive views', async () => {
    await renderWithProviders(<Text>plain</Text>);

    expect(countTouchables(screen.root!)).toBe(0);
    expect(auditTouchables(screen.root!)).toEqual([]);
  });
});
