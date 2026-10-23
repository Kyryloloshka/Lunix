import { Decimal } from '@shared/lib/decimal';

export interface ResourceState {
  capital: Decimal;       // 💵 Гроші / Зарплата
  cognitive: Decimal;     // 🧠 Когнітивні очки / Знання
  influence: Decimal;     // ⚡ Хайп / Репутація
  stress: number;         // 🔥 Стрес (0..100)
}

export interface ResourceRates {
  capitalPerSec: Decimal;
  cognitivePerSec: Decimal;
  influencePerSec: Decimal;
  capitalPerClick: Decimal;
  cognitivePerClick: Decimal;
  influencePerClick: Decimal;
}

export interface FlowState {
  isActive: boolean;
  durationMs: number;
  remainingMs: number;
  multiplier: number;     // e.g. 3.0 (x3 до всього)
  comboCount: number;
  lastTapAt: number;
  windowStartedAt: number;
}
