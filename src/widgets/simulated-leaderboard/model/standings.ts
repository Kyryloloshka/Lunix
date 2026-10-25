import { Decimal } from '@shared/lib/decimal';
import type { NpcLeader } from './npcLeaders';

/**
 * Simulated leaderboard model (T-010). Pure and deterministic: the only inputs are the fixed NPC list and the
 * player's lifetime Capital (`totalCapitalEarned`, already in the save). Same save в†’ same numbers, no RNG, no
 * clock, no new save fields.
 *
 * NPC growth: `capital = base В· (1 + P)^О±`, where `P` is the player's lifetime Capital and `О±` is a per-NPC
 * exponent seeded from the NPC id (FNV-1a hash) in `[NPC_GROWTH_MIN, NPC_GROWTH_MAX]`. Because `О± < 1`, an NPC's
 * capital grows strictly slower than the player's (d log NPC / d log P = О±В·P/(1+P) < 1), so the gap to the next
 * NPC always shrinks while the player earns: nobody near the player ever runs away. Computed in log space, so it
 * stays exact past 1e308.
 */
export const NPC_GROWTH_MIN = 0.02;
export const NPC_GROWTH_MAX = 0.08;

export interface Standing {
  /** NPC id, or `PLAYER_ID` for the player. */
  id: string;
  capital: Decimal;
  isPlayer: boolean;
  /** 1-based place. */
  place: number;
}

export interface Rival {
  id: string;
  capital: Decimal;
  /** Rival capital minus player capital (в‰Ґ 0; 0 = tied, any further Capital overtakes). */
  gap: Decimal;
  /** Player capital / rival capital, clamped to [0, 1]. */
  progress: number;
}

export const PLAYER_ID = 'player';

/** FNV-1a 32-bit hash of a string: stable seed for per-NPC jitter. */
export function hashSeed(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Growth exponent О± of one NPC, deterministic from its id. */
export function npcGrowthExponent(id: string): number {
  const unit = hashSeed(id) / 0xffffffff;
  return NPC_GROWTH_MIN + unit * (NPC_GROWTH_MAX - NPC_GROWTH_MIN);
}

/** log10 of a positive Decimal; works for any exponent (no `toNumber`). */
function log10(value: Decimal): number {
  return value.exponent + Math.log10(Math.abs(value.mantissa));
}

/** An NPC's capital for the given player lifetime Capital. Negative/zero player capital means no growth. */
export function npcCapitalAt(base: Decimal, growthExponent: number, playerLifetimeCapital: Decimal): Decimal {
  if (!base.isPositive()) return Decimal.ZERO;
  if (!playerLifetimeCapital.isPositive()) return base;
  return Decimal.fromLog10(log10(base) + growthExponent * log10(playerLifetimeCapital.add(1)));
}

/**
 * Full simulated board, sorted by capital (highest first). The player ranks below an NPC with the exact same
 * capital: overtaking means strictly more. The player appears exactly once.
 */
export function buildStandings(npcs: readonly NpcLeader[], playerLifetimeCapital: Decimal): Standing[] {
  const player = playerLifetimeCapital.isPositive() ? playerLifetimeCapital : Decimal.ZERO;
  const entries = [
    ...npcs.map((npc) => ({
      id: npc.id,
      capital: npcCapitalAt(npc.capital, npcGrowthExponent(npc.id), player),
      isPlayer: false,
    })),
    { id: PLAYER_ID, capital: player, isPlayer: true },
  ];
  entries.sort((a, b) => {
    const byCapital = b.capital.compareTo(a.capital);
    if (byCapital !== 0) return byCapital;
    return Number(a.isPlayer) - Number(b.isPlayer);
  });
  return entries.map((entry, index) => ({ ...entry, place: index + 1 }));
}

/** The NPC directly above the player, or `null` when the player is 1st. */
export function selectRival(standings: readonly Standing[]): Rival | null {
  const playerIndex = standings.findIndex((entry) => entry.isPlayer);
  if (playerIndex <= 0) return null;
  const player = standings[playerIndex];
  const rival = standings[playerIndex - 1];
  const gap = rival.capital.subtract(player.capital);
  const ratio = rival.capital.isPositive() ? player.capital.divide(rival.capital) : Decimal.ZERO;
  // ratio is bounded to [0, 1] here, so converting it is safe.
  const progress = Math.min(1, Math.max(0, ratio.toNumber()));
  return {
    id: rival.id,
    capital: rival.capital,
    gap: gap.isPositive() ? gap : Decimal.ZERO,
    progress: Number.isFinite(progress) ? progress : 0,
  };
}
