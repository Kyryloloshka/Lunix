import { Decimal } from '@shared/lib/decimal';
import {
  FRESH_ONBOARDING,
  advanceOnboarding,
  getFirstSkillCost,
  getGuideStage,
  useOnboardingStore,
  type OnboardingProgress,
  type OnboardingSignals,
} from '..';

const fresh: OnboardingProgress = { ...FRESH_ONBOARDING, stressHintOpen: false };
const signals = (overrides: Partial<OnboardingSignals> = {}): OnboardingSignals => ({
  cognitive: Decimal.ZERO,
  cognitiveEarned: Decimal.ZERO,
  skillLevelsTotal: 0,
  stress: 0,
  rank: 0,
  consoleActive: true,
  ...overrides,
});

describe('advanceOnboarding', () => {
  it('changes nothing for an untouched game and returns the same object', () => {
    expect(advanceOnboarding(fresh, signals())).toBe(fresh);
  });

  it('marks the tap step on the first earned Cognitive', () => {
    const next = advanceOnboarding(fresh, signals({ cognitiveEarned: Decimal.from(1) }));
    expect(next.tapDone).toBe(true);
    expect(next.buyDone).toBe(false);
  });

  it('marks tap and buy once a skill is owned, even without tap history', () => {
    const next = advanceOnboarding(fresh, signals({ skillLevelsTotal: 1 }));
    expect(next).toMatchObject({ tapDone: true, buyDone: true });
  });

  it('is idempotent', () => {
    const once = advanceOnboarding(fresh, signals({ cognitiveEarned: Decimal.from(5) }));
    expect(advanceOnboarding(once, signals({ cognitiveEarned: Decimal.from(5) }))).toBe(once);
  });

  it('opens the stress card at 30% and closes it only after resting below 15%', () => {
    const tapped = advanceOnboarding(fresh, signals({ cognitiveEarned: Decimal.from(5) }));
    expect(advanceOnboarding(tapped, signals({ cognitiveEarned: Decimal.from(5), stress: 29 })).stressHintOpen).toBe(false);
    const open = advanceOnboarding(tapped, signals({ cognitiveEarned: Decimal.from(5), stress: 30 }));
    expect(open.stressHintOpen).toBe(true);
    // Hysteresis: dipping to 20% does not close it.
    const stillOpen = advanceOnboarding(open, signals({ cognitiveEarned: Decimal.from(5), stress: 20 }));
    expect(stillOpen.stressHintOpen).toBe(true);
    const done = advanceOnboarding(stillOpen, signals({ cognitiveEarned: Decimal.from(5), stress: 10 }));
    expect(done).toMatchObject({ stressHintOpen: false, stressDone: true });
  });

  it('keeps the stress card pending when the player rested on another tab', () => {
    const tapped = { ...fresh, tapDone: true };
    const open = advanceOnboarding(tapped, signals({ stress: 35 }));
    const away = advanceOnboarding(open, signals({ stress: 5, consoleActive: false }));
    expect(away).toMatchObject({ stressHintOpen: false, stressDone: false });
    // It only opens on the Console tab.
    expect(advanceOnboarding(away, signals({ stress: 40, consoleActive: false })).stressHintOpen).toBe(false);
    expect(advanceOnboarding(away, signals({ stress: 40 })).stressHintOpen).toBe(true);
  });

  it('never reopens the stress card after it was done', () => {
    const done = { ...fresh, tapDone: true, stressDone: true };
    expect(advanceOnboarding(done, signals({ stress: 90 })).stressHintOpen).toBe(false);
  });

  it('finishes every step at the first job', () => {
    const open = { ...fresh, tapDone: true, stressHintOpen: true };
    expect(advanceOnboarding(open, signals({ rank: 1 }))).toMatchObject({
      tapDone: true,
      buyDone: true,
      stressDone: true,
      stressHintOpen: false,
    });
  });
});

describe('getGuideStage', () => {
  const afterIntro = { ...FRESH_ONBOARDING, introDone: true };

  it('shows nothing during the intro', () => {
    expect(getGuideStage(FRESH_ONBOARDING, false)).toBeNull();
  });

  it('walks tap → warmup → buy → done', () => {
    expect(getGuideStage(afterIntro, false)).toBe('tap');
    const tapped = { ...afterIntro, tapDone: true };
    expect(getGuideStage(tapped, false)).toBe('warmup');
    expect(getGuideStage(tapped, true)).toBe('buy');
    expect(getGuideStage({ ...tapped, buyDone: true }, true)).toBeNull();
  });

  it('prices the first skill from the registry and compares with Decimal past 1e308', () => {
    expect(getFirstSkillCost().isPositive()).toBe(true);
    expect(new Decimal(1, 400).gte(getFirstSkillCost())).toBe(true);
  });
});

describe('onboarding store', () => {
  beforeEach(() => useOnboardingStore.getState().reset());

  it('starts fresh and hydrates a stored snapshot without opening the stress card', () => {
    expect(useOnboardingStore.getState().introDone).toBe(false);
    useOnboardingStore.getState().hydrate({ introDone: true, tapDone: true, buyDone: false, stressDone: false });
    const state = useOnboardingStore.getState();
    expect(state).toMatchObject({ introDone: true, tapDone: true, buyDone: false, stressHintOpen: false });
  });

  it('replay does not change saved progress and ends with the intro', () => {
    useOnboardingStore.getState().hydrate({ introDone: true, tapDone: true, buyDone: true, stressDone: true });
    useOnboardingStore.getState().replayIntro();
    expect(useOnboardingStore.getState().replayingIntro).toBe(true);
    useOnboardingStore.getState().completeIntro();
    expect(useOnboardingStore.getState()).toMatchObject({ replayingIntro: false, introDone: true, buyDone: true });
  });

  it('dismissing the stress card closes it for good', () => {
    const store = useOnboardingStore.getState();
    store.sync(signals({ cognitiveEarned: Decimal.from(5), stress: 40 }));
    expect(useOnboardingStore.getState().stressHintOpen).toBe(true);
    useOnboardingStore.getState().dismissStressHint();
    useOnboardingStore.getState().sync(signals({ cognitiveEarned: Decimal.from(5), stress: 60 }));
    expect(useOnboardingStore.getState()).toMatchObject({ stressHintOpen: false, stressDone: true });
  });
});
