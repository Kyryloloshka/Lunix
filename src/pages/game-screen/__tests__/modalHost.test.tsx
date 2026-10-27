import { act, fireEvent, screen } from '@testing-library/react-native';
import { Decimal } from '@shared/lib/decimal';
import { setLocale } from '@shared/i18n';
import en from '@shared/i18n/locales/en.json';
import { useModalQueue } from '@shared/lib/modal-queue';
import { renderWithProviders } from '@shared/lib/testing/renderWithProviders';
import { COMPLETED_ONBOARDING, useOnboardingStore } from '@features/onboarding';
import { useSkillStore } from '@features/purchase-skill';
import { showPromotionCelebration } from '@widgets/career-roadmap';
import { showOfflineReport } from '@widgets/welcome-back';
import { ModalHost } from '../ui/ModalHost';

const offlineTitle = /You were gone for/;
const promotionEyebrow = en.career.celebrateEyebrow;
const unlockEyebrow = en.resourceUnlock.eyebrow;

describe('ModalHost (shared modal queue)', () => {
  beforeEach(() => {
    setLocale('en');
    useModalQueue.getState().clear();
    useSkillStore.getState().reset();
    useOnboardingStore.getState().hydrate(COMPLETED_ONBOARDING);
  });

  afterAll(() => setLocale('uk'));

  it('shows one modal at a time, in priority order: offline, promotion, resource unlock', async () => {
    await renderWithProviders(<ModalHost />);
    await act(async () => {
      useSkillStore.setState({ pendingResourceUnlocks: ['capital'] });
      showPromotionCelebration(3);
      showOfflineReport({ seconds: 3600, capped: false, capital: Decimal.ZERO, cognitive: Decimal.from(500), influence: Decimal.ZERO }, 3);
    });

    expect(screen.getByText(offlineTitle)).toBeOnTheScreen();
    expect(screen.queryByText(promotionEyebrow)).toBeNull();
    expect(screen.queryByText(unlockEyebrow)).toBeNull();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: en.welcomeBack.collectA11y }));
    });
    expect(screen.getByText(promotionEyebrow)).toBeOnTheScreen();
    expect(screen.queryByText(unlockEyebrow)).toBeNull();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${en.career.celebrateA11y.split('{')[0]}`) }));
    });
    expect(screen.getByText(unlockEyebrow)).toBeOnTheScreen();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: /^New resource/ }));
    });
    expect(screen.queryByText(unlockEyebrow)).toBeNull();
    expect(useSkillStore.getState().pendingResourceUnlocks).toHaveLength(0);
    expect(useModalQueue.getState().queue).toHaveLength(0);
  });

  it('waits while the intro is on screen', async () => {
    useOnboardingStore.getState().reset();
    await renderWithProviders(<ModalHost />);
    await act(async () => {
      showPromotionCelebration(1);
    });
    expect(screen.queryByText(promotionEyebrow)).toBeNull();

    await act(async () => {
      useOnboardingStore.getState().hydrate(COMPLETED_ONBOARDING);
    });
    expect(screen.getByText(promotionEyebrow)).toBeOnTheScreen();
  });
});
