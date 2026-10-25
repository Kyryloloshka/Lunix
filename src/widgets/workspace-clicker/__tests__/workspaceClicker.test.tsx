import { fireEvent, screen } from '@testing-library/react-native';
import { setLocale } from '@shared/i18n';
import { renderWithProviders } from '@shared/lib/testing/renderWithProviders';
import { useCurrencyStore } from '@entities/currency';
import { useSkillStore } from '@features/purchase-skill';
import { WorkspaceClicker } from '../ui/WorkspaceClicker';

// Screen readers (and these tests) tap through the zone's "activate" accessibility action.
const tapOnce = () => fireEvent(
  screen.getByTestId('workspace-tap-zone'),
  'accessibilityAction',
  { nativeEvent: { actionName: 'activate' } },
);

describe('WorkspaceClicker', () => {
  beforeEach(() => {
    setLocale('en');
    useCurrencyStore.getState().reset();
    useSkillStore.getState().reset();
  });

  afterAll(() => setLocale('uk'));

  it('a tap raises Cognitive (the starting tap resource) and nothing else', async () => {
    await renderWithProviders(<WorkspaceClicker />);
    const before = useCurrencyStore.getState();
    expect(before.cognitive.isZero()).toBe(true);

    await tapOnce();

    const after = useCurrencyStore.getState();
    expect(after.cognitive.gt(0)).toBe(true);
    expect(after.totalCognitiveEarned.eq(after.cognitive)).toBe(true);
    expect(after.capital.isZero()).toBe(true);
    expect(after.influence.isZero()).toBe(true);
  });

  it('every tap adds to the balance, and the zone is exposed as one labelled button', async () => {
    await renderWithProviders(<WorkspaceClicker />);
    const zone = screen.getByTestId('workspace-tap-zone');
    expect(zone.props.accessibilityRole).toBe('button');
    expect(zone.props.accessibilityLabel).toBeTruthy();

    await tapOnce();
    const afterOne = useCurrencyStore.getState().cognitive;
    await tapOnce();
    expect(useCurrencyStore.getState().cognitive.gt(afterOne)).toBe(true);
  });

  it('after the Capital rank the tap pays Capital instead of Cognitive', async () => {
    useSkillStore.setState({ currentRank: 3 });
    expect(useSkillStore.getState().setTapResource('capital')).toBe(true);
    await renderWithProviders(<WorkspaceClicker />);

    await tapOnce();

    const state = useCurrencyStore.getState();
    expect(state.capital.gt(0)).toBe(true);
    expect(state.cognitive.isZero()).toBe(true);
  });
});
