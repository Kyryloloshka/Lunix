import { fireEvent, screen } from '@testing-library/react-native';
import { Decimal } from '@shared/lib/decimal';
import { setLocale } from '@shared/i18n';
import en from '@shared/i18n/locales/en.json';
import es from '@shared/i18n/locales/es.json';
import uk from '@shared/i18n/locales/uk.json';
import { renderWithProviders } from '@shared/lib/testing/renderWithProviders';
import { auditTouchables, countTouchables } from '@shared/lib/testing/a11yAudit';
import { useCurrencyStore } from '@entities/currency';
import { useSkillStore } from '@features/purchase-skill';
import { COMPLETED_ONBOARDING, useOnboardingStore } from '@features/onboarding';
import { GameScreen } from '../ui/GameScreen';

type Strings = typeof en;
const TABS = ['work', 'skills', 'career', 'leaders', 'settings'] as const;
type Tab = (typeof TABS)[number];

/** Heading that only that tab renders (the Console tab has the tap zone instead of a heading). */
const HEADING: Record<Exclude<Tab, 'work'>, (strings: Strings) => string> = {
  skills: (strings) => strings.skills.heading,
  career: (strings) => strings.career.heading,
  leaders: (strings) => strings.leaderboard.heading,
  settings: (strings) => strings.settings.heading,
};

// Dock tabs append a badge hint to their label ("Stack, purchases available"), so match the start.
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const startsWith = (label: string) => new RegExp(`^${escapeRegExp(label)}(?:[.,]|$)`);

async function renderScreen() {
  return renderWithProviders(<GameScreen onResetProgress={async () => undefined} />);
}

async function openTab(tab: Tab, strings: Strings) {
  await fireEvent.press(screen.getByRole('tab', { name: startsWith(strings.nav[tab]) }));
}

describe('GameScreen', () => {
  beforeEach(() => {
    setLocale('en');
    useCurrencyStore.getState().reset();
    useSkillStore.getState().reset();
    // Players past the tutorial: no intro overlay, no guide hints.
    useOnboardingStore.getState().hydrate(COMPLETED_ONBOARDING);
  });

  afterAll(() => setLocale('uk'));

  it('switches tabs: the dock marks exactly one tab selected and the content follows it', async () => {
    await renderScreen();
    const selectedTabs = () => TABS.filter((tab) => (
      screen.getByRole('tab', { name: startsWith(en.nav[tab]) }).props.accessibilityState?.selected === true
    ));

    expect(selectedTabs()).toEqual(['work']);
    expect(screen.getByTestId('workspace-tap-zone')).toBeOnTheScreen();

    for (const tab of ['skills', 'career', 'leaders', 'settings'] as const) {
      await openTab(tab, en);
      expect(selectedTabs()).toEqual([tab]);
      expect(screen.getByText(HEADING[tab](en))).toBeOnTheScreen();
      expect(screen.queryByTestId('workspace-tap-zone')).toBeNull();
    }

    await openTab('work', en);
    expect(selectedTabs()).toEqual(['work']);
    expect(screen.getByTestId('workspace-tap-zone')).toBeOnTheScreen();
  });

  it('language switch from Settings changes the texts on every tab', async () => {
    setLocale('uk');
    await renderScreen();

    const expectTexts = async (strings: Strings) => {
      for (const tab of TABS) {
        // The dock label is the tab's accessible name, so a stale label would not be found.
        await openTab(tab, strings);
        if (tab !== 'work') expect(screen.getByText(HEADING[tab](strings))).toBeOnTheScreen();
      }
    };

    await expectTexts(uk);

    await openTab('settings', uk);
    await fireEvent.press(screen.getByRole('radio', { name: 'EN' }));
    expect(screen.getByRole('radio', { name: 'EN' }).props.accessibilityState.selected).toBe(true);
    await expectTexts(en);
    // Old-language headings are gone, not merely hidden behind the new ones.
    expect(screen.queryByText(uk.settings.heading)).toBeNull();

    await fireEvent.press(screen.getByRole('radio', { name: 'ES' }));
    await expectTexts(es);
    expect(screen.queryByText(en.settings.heading)).toBeNull();
  });

  it.each(TABS)('accessibility: every touchable on the %s tab has a role and a name', async (tab) => {
    await renderScreen();
    await openTab(tab, en);

    const root = screen.root!;
    // The dock alone has 5 tabs; an empty scan would make the audit pass vacuously.
    expect(countTouchables(root)).toBeGreaterThanOrEqual(TABS.length);
    expect(auditTouchables(root)).toEqual([]);
  });

  it.each(TABS)('accessibility: a mid-game save (rank 6, rich) keeps every %s control labelled', async (tab) => {
    // Later ranks add tap-mode switches, upgrade cards, influence skills and leadership promotions.
    useSkillStore.setState({ currentRank: 6 });
    useCurrencyStore.getState().addResources({
      cognitive: Decimal.from(1e12),
      capital: Decimal.from(1e12),
      influence: Decimal.from(1e9),
    });
    await renderScreen();
    await openTab(tab, en);

    const root = screen.root!;
    expect(countTouchables(root)).toBeGreaterThanOrEqual(TABS.length);
    expect(auditTouchables(root)).toEqual([]);
  });
});
