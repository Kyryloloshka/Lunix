import { create } from 'zustand';
import { Decimal } from '@shared/lib/decimal';
import type { FlowState, ResourceRates, ResourceState } from './types';

const FLOW_DURATION_MS = 10_000;
const FLOW_MULTIPLIER = 3;
export const FLOW_COMBO_THRESHOLD = 12;
export const COMBO_WINDOW_MS = 4_000;
const MAX_STRESS = 100;
const OVERLOAD_THRESHOLD = 70;
const OVERLOAD_MIN_OUTPUT = 0.5;

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
  tap: () => { capital: Decimal; cognitive: Decimal; influence: Decimal; isCritical: boolean };
  tick: (deltaSeconds: number) => void;
  addResources: (resources: Partial<Omit<ResourceState, 'stress'>>) => void;
  spendCapital: (amount: Decimal) => boolean;
  spendResources: (resources: Partial<Omit<ResourceState, 'stress'>>) => boolean;
  addStress: (amount: number) => void;
  reduceStress: (amount: number) => void;
  updateRates: (rates: Partial<ResourceRates>) => void;
  saveTimestamp: () => void;
  reset: () => void;
}

const initialRates: ResourceRates = {
  capitalPerSec: Decimal.from(0),
  cognitivePerSec: Decimal.from(0),
  influencePerSec: Decimal.from(0),
  capitalPerClick: Decimal.from(1),
  cognitivePerClick: Decimal.from(0.1),
  influencePerClick: Decimal.from(0),
};

const initialState = (): ResourceState & { flow: FlowState; rates: ResourceRates; lastSavedAt: number; totalCapitalEarned: Decimal } => ({
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
});

export const useCurrencyStore = create<CurrencyStore>((set, get) => ({
  ...initialState(),

  tap: () => {
    const { rates, flow, stress } = get();
    const isCritical = Math.random() < 0.08;
    const bonusMultiplier = flow.isActive ? flow.multiplier : isCritical ? 2 : 1;
    const outputMultiplier = bonusMultiplier * getStressOutputMultiplier(stress);
    const capital = rates.capitalPerClick.multiplyScalar(outputMultiplier);
    const cognitive = rates.cognitivePerClick.multiplyScalar(outputMultiplier);
    const influence = rates.influencePerClick.multiplyScalar(outputMultiplier);

    set((state) => {
      const now = Date.now();
      const nextStress = Math.min(MAX_STRESS, state.stress + 0.35);
      const windowOpen = now - state.flow.windowStartedAt <= COMBO_WINDOW_MS;
      const nextCombo = state.flow.isActive
        ? state.flow.comboCount
        : (windowOpen ? state.flow.comboCount + 1 : 1);
      const flowIsActive = state.flow.isActive || nextCombo >= FLOW_COMBO_THRESHOLD;
      return {
        capital: state.capital.add(capital),
        cognitive: state.cognitive.add(cognitive),
        influence: state.influence.add(influence),
        stress: nextStress,
        totalCapitalEarned: state.totalCapitalEarned.add(capital),
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

    return { capital, cognitive, influence, isCritical };
  },

  tick: (deltaSeconds) => {
    if (deltaSeconds <= 0 || !Number.isFinite(deltaSeconds)) return;
    const { rates, flow, stress } = get();
    const bonusMultiplier = flow.isActive ? flow.multiplier : 1;
    const outputMultiplier = bonusMultiplier * getStressOutputMultiplier(stress);
    const capital = rates.capitalPerSec.multiplyScalar(deltaSeconds * outputMultiplier);
    const cognitive = rates.cognitivePerSec.multiplyScalar(deltaSeconds * outputMultiplier);
    const influence = rates.influencePerSec.multiplyScalar(deltaSeconds * outputMultiplier);
    const flowDelta = deltaSeconds * 1000;

    set((state) => {
      const remainingMs = Math.max(0, state.flow.remainingMs - flowDelta);
      return {
        capital: state.capital.add(capital),
        cognitive: state.cognitive.add(cognitive),
        influence: state.influence.add(influence),
        stress: Math.max(0, state.stress - deltaSeconds * 0.25),
        totalCapitalEarned: state.totalCapitalEarned.add(capital),
        flow: {
          ...state.flow,
          remainingMs,
          isActive: remainingMs > 0,
          comboCount: remainingMs > 0 ? state.flow.comboCount : 0,
        },
      };
    });
  },

  addResources: (resources) => set((state) => ({
    capital: resources.capital ? state.capital.add(resources.capital) : state.capital,
    cognitive: resources.cognitive ? state.cognitive.add(resources.cognitive) : state.cognitive,
    influence: resources.influence ? state.influence.add(resources.influence) : state.influence,
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

  addStress: (amount) => set((state) => ({ stress: Math.min(MAX_STRESS, Math.max(0, state.stress + amount)) })),
  reduceStress: (amount) => set((state) => ({ stress: Math.max(0, state.stress - Math.max(0, amount)) })),
  updateRates: (rates) => set((state) => ({ rates: { ...state.rates, ...rates } })),
  saveTimestamp: () => set({ lastSavedAt: Date.now() }),
  reset: () => set(initialState()),
}));

export const selectResources = (state: CurrencyStore): ResourceState => ({
  capital: state.capital,
  cognitive: state.cognitive,
  influence: state.influence,
  stress: state.stress,
});
