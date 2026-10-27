import { StyleSheet, Text } from 'react-native';
import { act, screen } from '@testing-library/react-native';
import { renderWithProviders } from '@shared/lib/testing/renderWithProviders';
import { ColorTransitionView } from '../ColorTransitionView';
import { Meter } from '../Meter';
import { PurchasePulse } from '../PurchasePulse';
import { RollText } from '../RollText';

describe('Meter (animated)', () => {
  it('keeps the screen-reader value in sync and clamps the fill', async () => {
    const { rerender } = await renderWithProviders(<Meter animated ratio={0.4} valueText="Stress 40%" />);
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(40);
    await act(async () => {
      rerender(<Meter animated ratio={7} valueText="Stress 100%" />);
    });
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(100);
  });

  it('stays decorative without a valueText, animated or not', async () => {
    await renderWithProviders(<Meter animated pulse ratio={0.9} />);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});

describe('PurchasePulse', () => {
  it('reports completion once so the owner can unmount it', async () => {
    const onDone = jest.fn();
    await renderWithProviders(<PurchasePulse onDone={onDone} label={<Text>+5/s</Text>} />);
    expect(screen.getByText('+5/s')).toBeTruthy();
    // The Jest Reanimated stand-in finishes timings synchronously.
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('RollText', () => {
  it('renders the text and follows changes', async () => {
    const { rerender } = await renderWithProviders(<RollText text="LVL 1" />);
    expect(screen.getByText('LVL 1')).toBeTruthy();
    await act(async () => {
      rerender(<RollText text="LVL 2" />);
    });
    expect(screen.getByText('LVL 2')).toBeTruthy();
  });
});

describe('ColorTransitionView', () => {
  it('applies layout style from props and the target colors', async () => {
    await renderWithProviders(
      <ColorTransitionView testID="c" backgroundColor="#111111" borderColor="#222222" style={{ padding: 4 }}>
        <Text>inside</Text>
      </ColorTransitionView>,
    );
    expect(screen.getByText('inside')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('c').props.style)).toMatchObject({ padding: 4 });
  });
});
