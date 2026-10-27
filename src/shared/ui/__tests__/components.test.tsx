import { StyleSheet, Text } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '@shared/lib/testing/renderWithProviders';
import { Button } from '../Button';
import { ListRow } from '../Card';
import { MIN_TOUCH_TARGET } from '../layout';
import { clampRatio, Meter } from '../Meter';
import { SegmentedControl } from '../SegmentedControl';
import { Toggle } from '../Toggle';

describe('Button', () => {
  it('presses, exposes role and name, and is at least 44 pt tall', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button onPress={onPress}>Promote</Button>);
    const button = screen.getByRole('button', { name: 'Promote' });
    expect(StyleSheet.flatten(button.props.style).minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('disabled button does not fire and speaks its reason', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <Button disabled disabledReason="need 5 more" accessibilityLabel="Buy Git" onPress={onPress}>
        <Text>price</Text>
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Buy Git. need 5 more' });
    expect(button.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('loading blocks presses and reports busy', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button loading accessibilityLabel="Reset" onPress={onPress}>Reset</Button>);
    const button = screen.getByRole('button', { name: 'Reset' });
    expect(button.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('SegmentedControl', () => {
  const options = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
  ] as const;

  it('marks the selected radio and reports changes', async () => {
    const onChange = jest.fn();
    await renderWithProviders(<SegmentedControl role="radio" options={options} value="a" onChange={onChange} />);
    expect(screen.getByRole('radio', { name: 'A' }).props.accessibilityState).toMatchObject({ selected: true, checked: true });
    expect(screen.getByRole('radio', { name: 'B' }).props.accessibilityState.selected).toBe(false);
    await fireEvent.press(screen.getByRole('radio', { name: 'B' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('tab mode exposes tabs with a selected state', async () => {
    await renderWithProviders(<SegmentedControl role="tab" options={options} value="b" onChange={jest.fn()} />);
    expect(screen.getByRole('tab', { name: 'B' }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByRole('tab', { name: 'A' }).props.accessibilityState.selected).toBe(false);
  });
});

describe('Toggle', () => {
  it('shows the state as text and flips it on press', async () => {
    const onChange = jest.fn();
    await renderWithProviders(<Toggle label="Haptics" value onChange={onChange} onText="ON" offText="OFF" />);
    const toggle = screen.getByRole('switch');
    expect(toggle.props.accessibilityState.checked).toBe(true);
    expect(screen.getByText('ON')).toBeOnTheScreen();
    await fireEvent.press(toggle);
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe('Meter', () => {
  it('clamps ratios, including NaN and infinity', () => {
    expect(clampRatio(-1)).toBe(0);
    expect(clampRatio(2)).toBe(1);
    expect(clampRatio(Number.NaN)).toBe(0);
    expect(clampRatio(Number.POSITIVE_INFINITY)).toBe(0);
    expect(clampRatio(0.4)).toBe(0.4);
  });

  it('with valueText is a progressbar carrying a 0..100 value', async () => {
    await renderWithProviders(<Meter ratio={0.42} valueText="Stress 42%" />);
    const bar = screen.getByRole('progressbar', { name: 'Stress 42%' });
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 42 });
  });

  it('without valueText is decorative (not a progressbar)', async () => {
    await renderWithProviders(<Meter ratio={0.5} />);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});

describe('ListRow', () => {
  it('renders icon, body and trailing action', async () => {
    await renderWithProviders(
      <ListRow icon={<Text>i</Text>} trailing={<Text>go</Text>}>
        <Text>body</Text>
      </ListRow>,
    );
    expect(screen.getByText('i')).toBeOnTheScreen();
    expect(screen.getByText('body')).toBeOnTheScreen();
    expect(screen.getByText('go')).toBeOnTheScreen();
  });
});
