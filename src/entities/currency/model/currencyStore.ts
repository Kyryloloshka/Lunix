import { create } from 'zustand';
import { Decimal } from '@shared/lib/decimal';
import type { FlowState, ResourceRates, ResourceState, TapResource } from './types';

const FLOW_DURATION_MS = 10_000;
const FLOW_MULTIPLIER = 3;
export const FLOW_COMBO_THRESHOLD = 12;
export const COMBO_WINDOW_MS = 4_000;
const MAX_STRESS = 100;
const OVERLOAD_THRESHOLD = 70;
const OVERLOAD_MIN_OUTPUT = 0.5;
const BASE_STRESS_PER_TAP = 0.35;
const STRESS_DECAY_PER_SEC = 0.25;
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
  },
  rates: initialRates,
  lastSavedAt: Date.now(),
  totalCapitalEarned: Decimal.ZERO,
  totalCognitiveEarned: Decimal.ZERO,
});

export const useCurrencyStore = create<CurrencyStore>((set, get) => ({
  ...initialState(),

  tap: (resource = 'cognitive') => {
    const { rates, flow, stress } = get();
    // Flow already multiplies output, so crits only roll outside of it.
    const isCritical = !flow.isActive && Math.random() < 0.08;
    const bonusMultiplier = flow.isActive ? flow.multiplier : isCritical ? 2 : 1;
    const outputMultiplier = bonusMultiplier * getStressOutputMultiplier(stress);
    const amount = getTapValue(rates, resource).multiplyScalar(outputMultiplier);

    set((state) => {
      const now = Date.now();
      const nextStress = clampStress(state.stress + BASE_STRESS_PER_TAP * state.rates.stressPerClickMultiplier);
      const windowOpen = now - state.flow.windowStartedAt <= COMBO_WINDOW_MS;
      const nextCombo = state.flow.isActive
        ? state.flow.comboCount
        : (windowOpen ? state.flow.comboCount + 1 : 1);
      const flowIsActive = state.flow.isActive || nextCombo >= FLOW_COMBO_THRESHOLD;
      return {
        [resource]: state[resource].add(amount),
        ...(resource === 'capital' ? { totalCapitalEarned: state.totalCapitalEarned.add(amount) } : {}),
        ...(resource === 'cognitive' ? { totalCognitiveEarned: state.totalCognitiveEarned.add(amount) } : {}),
        stress: nextStress,
        flow: {
          ...state.flow,
          comboCount: nextCombo,
          isActive: flowIsActive,
          lastTapAt: now,
          windowStartedAt: windowOpen && !state.flow.isActive ? state.flow.windowStartedAt : now,
          remainingMs: flowIsActive && !state.flow.isActive ? FLOW_DURATION_MS : state.flow.remainingMs,
        },
      };
    });

    return { resource, amount, isCritical };
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

    set((state) => {
      const remainingMs = Math.max(0, state.flow.remainingMs - flowDelta);
      const flowEnded = state.flow.isActive && remainingMs === 0;
      const comboExpired = Date.now() - state.flow.windowStartedAt > COMBO_WINDOW_MS;
      return {
        capital: state.capital.add(capital),
        cognitive: state.cognitive.add(cognitive),
        influence: state.influence.add(influence),
        stress: clampStress(state.stress - deltaSeconds * STRESS_DECAY_PER_SEC),
        totalCapitalEarned: state.totalCapitalEarned.add(capital),
        totalCognitiveEarned: state.totalCognitiveEarned.add(cognitive),
        flow: {
          ...state.flow,
          remainingMs,
          isActive: remainingMs > 0,
          // Only drop the combo when flow ends or the combo window runs out,
          // otherwise every tick would wipe the taps the player is building up.
          comboCount: flowEnded || (!state.flow.isActive && comboExpired) ? 0 : state.flow.comboCount,
        },
      };
    });
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

  addStress: (amount) => set((state) => ({ stress: clampStress(state.stress + amount) })),
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
      stress: clampStress(state.stress - seconds * STRESS_DECAY_PER_SEC),
      flow: { ...state.flow, isActive: false, remainingMs: 0, comboCount: 0 },
    }));
    return earnings;
  },
  reset: () => set(initialState()),
}));

export const selectResources = (state: CurrencyStore): ResourceState => ({
  capital: state.capital,
  cognitive: state.cognitive,
  influence: state.influence,
  stress: state.stress,
});
