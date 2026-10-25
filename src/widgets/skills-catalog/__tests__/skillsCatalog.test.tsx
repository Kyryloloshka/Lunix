import { act, fireEvent, screen } from '@testing-library/react-native';
import { Decimal } from '@shared/lib/decimal';
import { setLocale } from '@shared/i18n';
import en from '@shared/i18n/locales/en.json';
import { renderWithProviders } from '@shared/lib/testing/renderWithProviders';
import { useCurrencyStore } from '@entities/currency';
import { skillById } from '@entities/skill';
import { useSkillStore } from '@features/purchase-skill';
import { SkillsCatalog } from '../ui/SkillsCatalog';

const SKILL_ID = 'html-tags';
// The label may carry a wait hint after the name ("BUY X. 5 more"), so match its start.
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const startsWith = (label: string) => new RegExp(`^${escapeRegExp(label)}(?:[.,]|$)`);
const BUY_LABEL = startsWith(`${en.skills.buy} ${en.skills.items['html-tags'].name}`);

const giveCognitive = (amount: number) => useCurrencyStore.getState().addResources({ cognitive: Decimal.from(amount) });
const buyButton = () => screen.getByRole('button', { name: BUY_LABEL });
const cost = () => skillById(SKILL_ID)!.baseCost;

describe('SkillsCatalog', () => {
  beforeEach(() => {
    setLocale('en');
    useCurrencyStore.getState().reset();
    useSkillStore.getState().reset();
  });

  afterAll(() => setLocale('uk'));

  it('buying a skill deducts the exact price and raises the level by one', async () => {
    const price = cost();
    giveCognitive(price.toNumber() + 15);
    await renderWithProviders(<SkillsCatalog />);

    expect(buyButton().props.accessibilityState.disabled).toBe(false);
    await fireEvent.press(buyButton());

    expect(useSkillStore.getState().levels[SKILL_ID]).toBe(1);
    expect(useCurrencyStore.getState().cognitive.eq(15)).toBe(true);
    // The production rate was recomputed (rates are derived, not stored).
    expect(useCurrencyStore.getState().rates.cognitivePerSec.isPositive()).toBe(true);
  });

  it('the buy button is disabled while the player cannot afford it, and pressing it does nothing', async () => {
    const price = cost();
    giveCognitive(price.toNumber() - 1);
    await renderWithProviders(<SkillsCatalog />);

    expect(buyButton().props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(buyButton());

    expect(useSkillStore.getState().levels[SKILL_ID]).toBe(0);
    expect(useCurrencyStore.getState().cognitive.eq(price.toNumber() - 1)).toBe(true);
  });

  it('the button becomes available as soon as the balance reaches the price', async () => {
    await renderWithProviders(<SkillsCatalog />);
    expect(buyButton().props.accessibilityState.disabled).toBe(true);

    await act(async () => giveCognitive(cost().toNumber()));
    // Subscribers re-render on the store change; the screen reader state follows.
    await screen.findByRole('button', { name: BUY_LABEL });
    expect(buyButton().props.accessibilityState.disabled).toBe(false);
  });
});
