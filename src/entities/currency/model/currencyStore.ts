import { create } from 'zustand';
import { Decimal } from '@shared/lib/decimal';
import { gameEvents } from '@entities/game-events';
import { RHYTHM_CONFIG, getResilienceMultiplier, getStressDecay } from './rhythm';
import { EMPTY_INCOME_WINDOW, ZERO_AMOUNTS, getIncomePerSec, recordIncome, type IncomeWindow, type ResourceAmounts } from './income';
import type { FlowState, ResourceRates, ResourceState, TapResource } from './types';

const FLOW_DURATION_MS = RHYTHM_CONFIG.flow.durationMs;
const FLOW_MULTIPLIER = RHYTHM_CONFIG.flow.multiplier;
const FLOW_COOLDOWN_MS = RHYTHM_CONFIG.flow.cooldownMs;
export const FLOW_COMBO_THRESHOLD = RHYTHM_CONFIG.flow.comboThreshold;
export const COMBO_WINDOW_MS = RHYTHM_CONFIG.flow.comboWindowMs;
const MAX_STRESS = RHYTHM_CONFIG.stress.max;
const OVERLOAD_THRESHOLD = RHYTHM_CONFIG.stress.overloadThreshold;
const OVERLOAD_MIN_OUTPUT = RHYTHM_CONFIG.stress.overloadMinOutput;
const BASE_STRESS_PER_TAP = RHYTHM_CONFIG.stress.perTap;
/** Chance that a tap outside Flow is a crit. */
export const CRIT_CHANCE = 0.08;
/** Output multiplier of a crit tap; the UI reads it from here so "CRIT ×N" matches the payout. */
export const CRIT_MULTIPLIER = 2;
/** Live ticks never apply more than this; longer gaps go through offline earnings. */
export const MAX_TICK_SECONDS = 5;
/** Base value of one tap per mode, before perks (docs/economy/phases.md §4). */
export const TAP_BASE: Record<TapResource, Decimal> = {
  cognitive: Decimal.from(1),
  capital: Decimal.from(2),
  influence: Decimal.from(0.2),
};
/** Each tap also yields this share of the resource's passive income per second, so taps stay relevant. */
export const TAP_PASSIVE_SHARE = 0.05;

const PER_SEC_KEY: Record<TapResource, 'capitalPerSec' | 'cognitivePerSec' | 'influencePerSec'> = {
  capital: 'capitalPerSec',
  cognitive: 'cognitivePerSec',
  influence: 'influencePerSec',
};
const PER_CLICK_KEY: Record<TapResource, 'capitalPerClick' | 'cognitivePerClick' | 'influencePerClick'> = {
  capital: 'capitalPerClick',
  cognitive: 'cognitivePerClick',
  influence: 'influencePerClick',
};

/** Value of one tap before flow, crit and stress: perk-boosted base plus a share of passive income. */
export function getTapValue(rates: ResourceRates, resource: TapResource): Decimal {
  return rates[PER_CLICK_KEY[resource]].add(rates[PER_SEC_KEY[resource]].multiplyScalar(TAP_PASSIVE_SHARE));
}

export interface TapResult {
  resource: TapResource;
  amount: Decimal;
  isCritical: boolean;
  /** Flow/crit bonus applied to this tap (1 = none), before the stress penalty. */
  multiplier: number;
}

export function getStressOutputMultiplier(stress: number): number {
  const safeStress = Math.min(MAX_STRESS, Math.max(0, Number.isFinite(stress) ? stress : 0));
  if (safeStress <= OVERLOAD_THRESHOLD) return 1;

  const overloadProgress = (safeStress - OVERLOAD_THRESHOLD) / (MAX_STRESS - OVERLOAD_THRESHOLD);
  return 1 - overloadProgress * (1 - OVERLOAD_MIN_OUTPUT);
}

export function getStressPenaltyPercent(stress: number): number {
  return Math.round((1 - getStressOutputMultiplier(stress)) * 100);
}

export interface CurrencyStore extends ResourceState {
  flow: FlowState;
  rates: ResourceRates;
  /** Real earnings per second in the last completed second (taps, passive, Flow, stress). Runtime only, never saved. */
  income: ResourceAmounts;
  incomeWindow: IncomeWindow;
  lastSavedAt: number;
  totalCapitalEarned: Decimal;
  totalCognitiveEarned: Decimal;
  /** Unlock checks live in the caller (career progression); this only applies the tap. */
  tap: (resource?: TapResource) => TapResult;
  tick: (deltaSeconds: number) => void;
  addResources: (resources: Partial<Omit<ResourceState, 'stress'>>) => void;
  spendCapital: (amount: Decimal) => boolean;
  spendResources: (resources: Partial<Omit<ResourceState, 'stress'>>) => boolean;
  addStress: (amount: number) => void;
  reduceStress: (amount: number) => void;
  updateRates: (rates: Partial<ResourceRates>) => void;
  saveTimestamp: () => void;
  hydrate: (snapshot: CurrencySnapshot) => void;
  applyOfflineProgress: (elapsedSeconds: number) => OfflineEarnings;
  reset: () => void;
}

export interface OfflineEarnings {
  seconds: number;
  capital: Decimal;
  cognitive: Decimal;
  influence: Decimal;
}

export const MAX_OFFLINE_SECONDS = 8 * 60 * 60;
/** Share of passive income earned while the app is closed. */
export const OFFLINE_EFFICIENCY = 1;

/** Clamp the time away: negative (clock moved back) or missing timestamps earn nothing. */
export function getOfflineSeconds(savedAt: number, now: number): number {
  if (!Number.isFinite(savedAt) || !Number.isFinite(now) || savedAt <= 0) return 0;
  return Math.min(MAX_OFFLINE_SECONDS, Math.max(0, (now - savedAt) / 1000));
}

/** Persistable subset of the currency state (rates are derived from skills). */
export interface CurrencySnapshot extends ResourceState {
  totalCapitalEarned: Decimal;
  totalCognitiveEarned: Decimal;
}

function clampStress(value: number): number {
  return Math.min(MAX_STRESS, Math.max(0, Number.isFinite(value) ? value : 0));
}

const initialRates: ResourceRates = {
  capitalPerSec: Decimal.from(0),
  cognitivePerSec: Decimal.from(0),
  influencePerSec: Decimal.from(0),
  capitalPerClick: TAP_BASE.capital,
  cognitivePerClick: TAP_BASE.cognitive,
  influencePerClick: TAP_BASE.influence,
  stressPerClickMultiplier: 1,
};

const initialState = (): ResourceState & {
  flow: FlowState;
  rates: ResourceRates;
  income: ResourceAmounts;
  incomeWindow: IncomeWindow;
  lastSavedAt: number;
  totalCapitalEarned: Decimal;
  totalCognitiveEarned: Decimal;
} => ({
  capital: Decimal.ZERO,
  cognitive: Decimal.ZERO,
  influence: Decimal.ZERO,
  stress: 0,
  flow: {
    isActive: false,
    durationMs: FLOW_DURATION_MS,
    remainingMs: 0,
    multiplier: FLOW_MULTIPLIER,
    comboCount: 0,
    lastTapAt: 0,
    windowStartedAt: 0,
    comboRemainingMs: 0,
    cooldownRemainingMs: 0,
  },
  rates: initialRates,
  income: ZERO_AMOUNTS,
  incomeWindow: EMPTY_INCOME_WINDOW,
  lastSavedAt: Date.now(),
  totalCapitalEarned: Decimal.ZERO,
  totalCognitiveEarned: Decimal.ZERO,
});

export const useCurrencyStore = create<CurrencyStore>((set, get) => ({
  ...initialState(),

  tap: (resource = 'cognitive') => {
    const { rates, flow, stress } = get();
    // Flow already multiplies output, so crits only roll outside of it.
    const isCritical = !flow.isActive && Math.random() < CRIT_CHANCE;
    const bonusMultiplier = flow.isActive ? flow.multiplier : isCritical ? CRIT_MULTIPLIER : 1;
    const outputMultiplier = bonusMultiplier * getStressOutputMultiplier(stress);
    const amount = getTapValue(rates, resource).multiplyScalar(outputMultiplier);

    let flowStarted = false;
    let overloadStress = -1;
    set((state) => {
      const now = Date.now();
      const { flow: current } = state;
      const nextStress = clampStress(state.stress + BASE_STRESS_PER_TAP * selectTapStressMultiplier(state));
      // The combo neither grows during Flow nor while Flow recharges.
      const comboLocked = current.isActive || current.cooldownRemainingMs > 0;
      const windowOpen = current.comboCount > 0 && now - current.windowStartedAt <= COMBO_WINDOW_MS;
      const nextCombo = comboLocked ? current.comboCount : (windowOpen ? current.comboCount + 1 : 1);
      const windowStartedAt = comboLocked || windowOpen ? current.windowStartedAt : now;
      const flowStarts = !comboLocked && nextCombo >= FLOW_COMBO_THRESHOLD;
      const flowIsActive = current.isActive || flowStarts;
      flowStarted = flowStarts && !current.isActive;
      if (state.stress <= OVERLOAD_THRESHOLD && nextStress > OVERLOAD_THRESHOLD) overloadStress = nextStress;
      return {
        [resource]: state[resource].add(amount),
        ...(resource === 'capital' ? { totalCapitalEarned: state.totalCapitalEarned.add(amount) } : {}),
        ...(resource === 'cognitive' ? { totalCognitiveEarned: state.totalCognitiveEarned.add(amount) } : {}),
        stress: nextStress,
        incomeWindow: recordIncome(state.incomeWindow, now, { [resource]: amount }),
        flow: {
          ...current,
          comboCount: nextCombo,
          isActive: flowIsActive,
          lastTapAt: now,
          windowStartedAt,
          comboRemainingMs: !flowIsActive && nextCombo > 0
            ? Math.max(0, COMBO_WINDOW_MS - (now - windowStartedAt))
            : 0,
          remainingMs: flowStarts ? FLOW_DURATION_MS : current.remainingMs,
        },
      };
    });

    // Events fire after the state is committed, so subscribers read the post-tap store.
    if (gameEvents.hasSubscribers()) {
      gameEvents.emit({ type: 'tap', resource, amount, crit: isCritical, flow: flow.isActive });
      if (flowStarted) gameEvents.emit({ type: 'flow_started' });
      if (overloadStress >= 0) gameEvents.emit({ type: 'stress_overload_entered', stress: overloadStress });
    }

    return { resource, amount, isCritical, multiplier: bonusMultiplier };
  },

  tick: (deltaSeconds) => {
    if (deltaSeconds <= 0 || !Number.isFinite(deltaSeconds)) return;
    deltaSeconds = Math.min(deltaSeconds, MAX_TICK_SECONDS);
    const { rates, flow, stress } = get();
    const bonusMultiplier = flow.isActive ? flow.multiplier : 1;
    const outputMultiplier = bonusMultiplier * getStressOutputMultiplier(stress);
    const capital = rates.capitalPerSec.multiplyScalar(deltaSeconds * outputMultiplier);
    const cognitive = rates.cognitivePerSec.multiplyScalar(deltaSeconds * outputMultiplier);
    const influence = rates.influencePerSec.multiplyScalar(deltaSeconds * outputMultiplier);
    const flowDelta = deltaSeconds * 1000;

    let flowEnded = false;
    set((state) => {
      const now = Date.now();
      const { flow: current } = state;
      let isActive = current.isActive;
      let remainingMs = current.remainingMs;
      let cooldownRemainingMs = current.cooldownRemainingMs;
      let comboCount = current.comboCount;
      if (current.isActive) {
        remainingMs = Math.max(0, current.remainingMs - flowDelta);
        if (remainingMs === 0) {
          // Flow ended inside this tick: the rest of the tick already counts toward the cooldown.
          isActive = false;
          flowEnded = true;
          comboCount = 0;
          cooldownRemainingMs = Math.max(0, FLOW_COOLDOWN_MS - (flowDelta - current.remainingMs));
        }
      } else {
        remainingMs = 0;
        cooldownRemainingMs = Math.max(0, current.cooldownRemainingMs - flowDelta);
      }
      const comboRemainingMs = !isActive && comboCount > 0
        ? Math.max(0, COMBO_WINDOW_MS - (now - current.windowStartedAt))
        : 0;
      // Only drop the combo when flow ends or the combo window runs out,
      // otherwise every tick would wipe the taps the player is building up.
      if (!isActive && comboRemainingMs === 0) comboCount = 0;
      const incomeWindow = recordIncome(state.incomeWindow, now, { capital, cognitive, influence }, flowDelta);
      return {
        incomeWindow,
        income: getIncomePerSec(incomeWindow, now),
        capital: state.capital.add(capital),
        cognitive: state.cognitive.add(cognitive),
        influence: state.influence.add(influence),
        stress: clampStress(state.stress - getStressDecay(deltaSeconds, now - current.lastTapAt)),
        totalCapitalEarned: state.totalCapitalEarned.add(capital),
        totalCognitiveEarned: state.totalCognitiveEarned.add(cognitive),
        flow: { ...current, isActive, remainingMs, cooldownRemainingMs, comboCount, comboRemainingMs },
      };
    });
    if (flowEnded) gameEvents.emit({ type: 'flow_ended' });
  },

  addResources: (resources) => set((state) => ({
    capital: resources.capital?.isPositive() ? state.capital.add(resources.capital) : state.capital,
    totalCapitalEarned: resources.capital?.isPositive()
      ? state.totalCapitalEarned.add(resources.capital)
      : state.totalCapitalEarned,
    cognitive: resources.cognitive?.isPositive() ? state.cognitive.add(resources.cognitive) : state.cognitive,
    totalCognitiveEarned: resources.cognitive?.isPositive()
      ? state.totalCognitiveEarned.add(resources.cognitive)
      : state.totalCognitiveEarned,
    influence: resources.influence?.isPositive() ? state.influence.add(resources.influence) : state.influence,
  })),

  spendCapital: (amount) => {
    if (amount.lt(Decimal.ZERO) || get().capital.lt(amount)) return false;
    set((state) => ({ capital: state.capital.subtract(amount) }));
    return true;
  },

  spendResources: (resources) => {
    const capital = resources.capital ?? Decimal.ZERO;
    const cognitive = resources.cognitive ?? Decimal.ZERO;
    const influence = resources.influence ?? Decimal.ZERO;
    const state = get();
    if (
      capital.isNegative()
      || cognitive.isNegative()
      || influence.isNegative()
      || state.capital.lt(capital)
      || state.cognitive.lt(cognitive)
      || state.influence.lt(influence)
    ) return false;

    set((current) => ({
      capital: current.capital.subtract(capital),
      cognitive: current.cognitive.subtract(cognitive),
      influence: current.influence.subtract(influence),
    }));
    return true;
  },

  addStress: (amount) => {
    const before = get().stress;
    set((state) => ({ stress: clampStress(state.stress + amount) }));
    const after = get().stress;
    if (before <= OVERLOAD_THRESHOLD && after > OVERLOAD_THRESHOLD) {
      gameEvents.emit({ type: 'stress_overload_entered', stress: after });
    }
  },
  reduceStress: (amount) => set((state) => ({ stress: Math.max(0, state.stress - Math.max(0, amount)) })),
  updateRates: (rates) => set((state) => ({ rates: { ...state.rates, ...rates } })),
  saveTimestamp: () => set({ lastSavedAt: Date.now() }),
  hydrate: (snapshot) => set({
    capital: snapshot.capital,
    cognitive: snapshot.cognitive,
    influence: snapshot.influence,
    stress: clampStress(snapshot.stress),
    totalCapitalEarned: snapshot.totalCapitalEarned,
    totalCognitiveEarned: snapshot.totalCognitiveEarned,
  }),
  applyOfflineProgress: (elapsedSeconds) => {
    const seconds = Math.min(MAX_OFFLINE_SECONDS, Math.max(0, Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0));
    const { rates } = get();
    // Offline time runs at base rate: no flow bonus and no stress penalty.
    const factor = seconds * OFFLINE_EFFICIENCY;
    const earnings: OfflineEarnings = {
      seconds,
      capital: rates.capitalPerSec.multiplyScalar(factor),
      cognitive: rates.cognitivePerSec.multiplyScalar(factor),
      influence: rates.influencePerSec.multiplyScalar(factor),
    };
    if (seconds <= 0) return earnings;
    get().addResources(earnings);
    set((state) => ({
      // Offline earnings are not live income: the window starts over after a return.
      incomeWindow: EMPTY_INCOME_WINDOW,
      income: ZERO_AMOUNTS,
      // Time away is rest: stress cools at the rest rate.
      stress: clampStress(state.stress - getStressDecay(seconds, Number.POSITIVE_INFINITY)),
      flow: {
        ...state.flow,
        isActive: false,
        remainingMs: 0,
        comboCount: 0,
        comboRemainingMs: 0,
        cooldownRemainingMs: 0,
      },
    }));
    return earnings;
  },
  reset: () => set(initialState()),
}));

/** Cognitive resilience alone (derived from lifetime Cognitive, never saved). */
export const selectResilienceMultiplier = (state: Pick<CurrencyStore, 'totalCognitiveEarned'>): number =>
  getResilienceMultiplier(state.totalCognitiveEarned);

/** Effective tap-stress multiplier: soft-skill reduction × Cognitive resilience. */
export const selectTapStressMultiplier = (
  state: Pick<CurrencyStore, 'rates' | 'totalCognitiveEarned'>,
): number => {
  const skill = state.rates.stressPerClickMultiplier;
  const safeSkill = Number.isFinite(skill) ? Math.min(1, Math.max(0, skill)) : 1;
  return safeSkill * selectResilienceMultiplier(state);
};

export const selectResources = (state: CurrencyStore): ResourceState => ({
  capital: state.capital,
  cognitive: state.cognitive,
  influence: state.influence,
  stress: state.stress,
});
