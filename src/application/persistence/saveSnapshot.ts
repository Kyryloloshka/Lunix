import { Decimal } from '@shared/lib/decimal';
import type { CurrencySnapshot } from '@entities/currency';
import type { SkillSnapshot } from '@features/purchase-skill';

export const SAVE_VERSION = 1;

interface SerializedDecimal {
  m: number;
  e: number;
}

export interface GameSaveV1 {
  version: 1;
  savedAt: number;
  currency: {
    capital: SerializedDecimal;
    cognitive: SerializedDecimal;
    influence: SerializedDecimal;
    totalCapitalEarned: SerializedDecimal;
    stress: number;
  };
  skills: SkillSnapshot;
}

export interface GameSave {
  savedAt: number;
  currency: CurrencySnapshot;
  skills: SkillSnapshot;
}

export function serializeGame(currency: CurrencySnapshot, skills: SkillSnapshot, savedAt: number): string {
  const payload: GameSaveV1 = {
    version: SAVE_VERSION,
    savedAt,
    currency: {
      capital: currency.capital.toJSON(),
      cognitive: currency.cognitive.toJSON(),
      influence: currency.influence.toJSON(),
      totalCapitalEarned: currency.totalCapitalEarned.toJSON(),
      stress: currency.stress,
    },
    skills: {
      levels: skills.levels,
      purchasedUpgrades: skills.purchasedUpgrades,
      currentRank: skills.currentRank,
    },
  };
  return JSON.stringify(payload);
}

function nonNegative(value: unknown): Decimal {
  const decimal = Decimal.fromJSON(value);
  return decimal.isNegative() ? Decimal.ZERO : decimal;
}

/**
 * Parse a stored save. Returns null for missing, corrupt or unknown-version data so the
 * caller starts a fresh game instead of crashing. Skill values are sanitized by the skill store.
 */
export function parseGame(raw: string | null): GameSave | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const save = data as Partial<GameSaveV1>;
  if (save.version !== SAVE_VERSION || !save.currency || typeof save.currency !== 'object') return null;

  const { currency } = save;
  const skills = (save.skills && typeof save.skills === 'object' ? save.skills : {}) as Partial<SkillSnapshot>;
  return {
    savedAt: typeof save.savedAt === 'number' && Number.isFinite(save.savedAt) ? save.savedAt : 0,
    currency: {
      capital: nonNegative(currency.capital),
      cognitive: nonNegative(currency.cognitive),
      influence: nonNegative(currency.influence),
      totalCapitalEarned: nonNegative(currency.totalCapitalEarned),
      stress: typeof currency.stress === 'number' ? currency.stress : 0,
    },
    skills: {
      levels: skills.levels && typeof skills.levels === 'object' ? skills.levels : {},
      purchasedUpgrades: Array.isArray(skills.purchasedUpgrades) ? skills.purchasedUpgrades : [],
      currentRank: typeof skills.currentRank === 'number' ? skills.currentRank : 0,
    },
  };
}
