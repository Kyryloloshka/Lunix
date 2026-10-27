import { createEventBus } from '@shared/lib/events';
import type { Decimal } from '@shared/lib/decimal';

export type GameResource = 'capital' | 'cognitive' | 'influence';

/**
 * Everything that happens in the game that other systems may react to (achievements, Golden Commit,
 * incidents, haptics, sound, analytics). Emitted by model actions only, after the change succeeded.
 * Add a member here to extend the vocabulary; the bus and the emitters need no change.
 */
export type GameEvent =
  | { type: 'tap'; resource: GameResource; amount: Decimal; crit: boolean; flow: boolean }
  | { type: 'skill_bought'; id: string; levels: number }
  | { type: 'upgrade_bought'; id: string }
  | { type: 'rank_up'; from: number; to: number }
  | { type: 'resource_unlocked'; resource: GameResource }
  | { type: 'flow_started' }
  | { type: 'flow_ended' }
  | { type: 'stress_overload_entered'; stress: number }
  // TODO(T-019): emitted by the offline screen task, which owns applyOfflineProgress.
  | { type: 'offline_claimed'; seconds: number };

export type GameEventType = GameEvent['type'];

/** The single game bus. Stores emit on it; subscribers are wired in `src/application` or by widgets. */
export const gameEvents = createEventBus<GameEvent>();
