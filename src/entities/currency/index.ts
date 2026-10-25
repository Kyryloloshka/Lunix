export {
  COMBO_WINDOW_MS,
  CRIT_CHANCE,
  CRIT_MULTIPLIER,
  FLOW_COMBO_THRESHOLD,
  MAX_OFFLINE_SECONDS,
  MAX_TICK_SECONDS,
  TAP_BASE,
  TAP_PASSIVE_SHARE,
  getOfflineSeconds,
  getStressOutputMultiplier,
  getStressPenaltyPercent,
  getTapValue,
  selectResilienceMultiplier,
  selectResources,
  selectTapStressMultiplier,
  useCurrencyStore,
} from './model/currencyStore';
export {
  RHYTHM_CONFIG,
  getResilienceMultiplier,
  getStressDecay,
  getStressReductionPercent,
  toCountdownSeconds,
} from './model/rhythm';
export type { CurrencySnapshot, CurrencyStore, OfflineEarnings, TapResult } from './model/currencyStore';
export type { FlowState, ResourceRates, ResourceState, TapResource } from './model/types';
