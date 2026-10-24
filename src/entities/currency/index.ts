export {
  COMBO_WINDOW_MS,
  FLOW_COMBO_THRESHOLD,
  MAX_OFFLINE_SECONDS,
  MAX_TICK_SECONDS,
  getOfflineSeconds,
  getStressOutputMultiplier,
  getStressPenaltyPercent,
  selectResources,
  useCurrencyStore,
} from './model/currencyStore';
export type { CurrencySnapshot, CurrencyStore, OfflineEarnings } from './model/currencyStore';
export type { FlowState, ResourceRates, ResourceState } from './model/types';
