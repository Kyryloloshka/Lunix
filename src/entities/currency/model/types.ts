import { Decimal } from '@shared/lib/decimal';

export interface ResourceState {
  capital: Decimal;       // 💵 Гроші / Зарплата
  cognitive: Decimal;     // 🧠 Когнітивні очки / Знання
  influence: Decimal;     // ⚡ Хайп / Репутація
  stress: number;         // 🔥 Стрес (0..100)
}

/** A spendable resource a tap can produce; matches the ResourceState keys. */
export type TapResource = 'cognitive' | 'capital' | 'influence';

export interface ResourceRates {
  capitalPerSec: Decimal;
  cognitivePerSec: Decimal;
  influencePerSec: Decimal;
  capitalPerClick: Decimal;
  cognitivePerClick: Decimal;
  influencePerClick: Decimal;
  stressPerClickMultiplier: number; // 1 = базовий стрес за тап, менше — кава/делегування
}

export interface FlowState {
  isActive: boolean;
  durationMs: number;
  remainingMs: number;
  multiplier: number;     // e.g. 3.0 (x3 до всього)
  comboCount: number;
  lastTapAt: number;
  windowStartedAt: number;
  /** Time left in the open combo window, refreshed by tap/tick so the HUD never reads the clock. */
  comboRemainingMs: number;
  /** After Flow ends the combo cannot build until this reaches 0. Runtime only, never saved. */
  cooldownRemainingMs: number;
}
