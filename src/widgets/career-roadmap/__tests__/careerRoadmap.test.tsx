import { act, fireEvent, screen } from '@testing-library/react-native';
import { Decimal } from '@shared/lib/decimal';
import { setLocale } from '@shared/i18n';
import en from '@shared/i18n/locales/en.json';
import { renderWithProviders } from '@shared/lib/testing/renderWithProviders';
import { CAREER_RANKS } from '@entities/career-rank';
import { useCurrencyStore } from '@entities/currency';
import { useSkillStore } from '@features/purchase-skill';
import { CareerRoadmap } from '../ui/CareerRoadmap';

// Rank 1 asks for lifetime Cognitive and a skill level (read from the registry, not hardcoded).
const [earnedReq, skillReq] = CAREER_RANKS[1].requirements;
if (earnedReq.type !== 'earned' || skillReq.type !== 'skillLevel') throw new Error('rank 1 requirements changed');

const NEXT_TITLE = en.career.ranks['1'].title;
const promoteButton = () => screen.getByRole('button', { name: new RegExp(NEXT_TITLE) });

const earnEnough = () => useCurrencyStore.setState({ totalCognitiveEarned: earnedReq.amount });
const levelEnough = () => useSkillStore.setState((state) => ({
  levels: { ...state.levels, [skillReq.skillId]: skillReq.level },
}));

describe('CareerRoadmap promotion', () => {
  beforeEach(() => {
    setLocale('en');
    useCurrencyStore.getState().reset();
    useSkillStore.getState().reset();
  });

  afterAll(() => setLocale('uk'));

  it('is blocked, with the reason, while no requirement is met', async () => {
    await renderWithProviders(<CareerRoadmap currentRankId={0} />);

    expect(promoteButton().props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(promoteButton());
    expect(useSkillStore.getState().currentRank).toBe(0);
  });

  it('stays blocked when only one of the two requirements is met', async () => {
    earnEnough();
    await renderWithProviders(<CareerRoadmap currentRankId={0} />);
    expect(promoteButton().props.accessibilityState.disabled).toBe(true);

    await act(async () => {
      useCurrencyStore.setState({ totalCognitiveEarned: Decimal.ZERO });
      levelEnough();
    });
    expect(promoteButton().props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(promoteButton());
    expect(useSkillStore.getState().currentRank).toBe(0);
  });

  it('becomes available once every requirement is met, and pressing it promotes the player', async () => {
    await renderWithProviders(<CareerRoadmap currentRankId={0} />);
    expect(promoteButton().props.accessibilityState.disabled).toBe(true);

    await act(async () => {
      earnEnough();
      levelEnough();
    });
    expect(promoteButton().props.accessibilityState.disabled).toBe(false);

    await fireEvent.press(promoteButton());
    expect(useSkillStore.getState().currentRank).toBe(1);
  });
});
