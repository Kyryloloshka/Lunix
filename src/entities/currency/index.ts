export {
  COMBO_WINDOW_MS,
  FLOW_COMBO_THRESHOLD,
  MAX_OFFLINE_SECONDS,
  MAX_TICK_SECONDS,
  TAP_BASE,
  TAP_PASSIVE_SHARE,
  getOfflineSeconds,
  getStressOutputMultiplier,
  getStressPenaltyPercent,
  getTapValue,
  selectResources,
  useCurrencyStore,
} from './model/currencyStore';
export type { CurrencySnapshot, CurrencyStore, OfflineEarnings, TapResult } from './model/currencyStore';
export type { FlowState, ResourceRates, ResourceState, TapResource } from './model/types';
