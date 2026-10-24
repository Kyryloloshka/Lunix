import { Decimal } from '@shared/lib/decimal';
import type { CurrencySnapshot } from '@entities/currency';
import type { SkillSnapshot } from '@features/purchase-skill';
import { getV1Refund, mapV1Rank } from './legacyV1';

/** v2: career phases (T-016) — new skill ids, 11 ranks, lifetime Cognitive. */
export const SAVE_VERSION = 2;

interface SerializedDecimal {
  m: number;
  e: number;
}

interface SerializedCurrencyV1 {
  capital: SerializedDecimal;
  cognitive: SerializedDecimal;
  influence: SerializedDecimal;
  totalCapitalEarned: SerializedDecimal;
  stress: number;
}

export interface GameSaveV1 {
  version: 1;
  savedAt: number;
  currency: SerializedCurrencyV1;
  skills: SkillSnapshot;
}

export interface GameSaveV2 {
  version: 2;
  savedAt: number;
  currency: SerializedCurrencyV1 & { totalCognitiveEarned: SerializedDecimal };
  skills: SkillSnapshot;
}

export interface GameSave {
  savedAt: number;
  currency: CurrencySnapshot;
  skills: SkillSnapshot;
}

export function serializeGame(currency: CurrencySnapshot, skills: SkillSnapshot, savedAt: number): string {
  const payload: GameSaveV2 = {
    version: SAVE_VERSION,
    savedAt,
    currency: {
      capital: currency.capital.toJSON(),
      cognitive: currency.cognitive.toJSON(),
      influence: currency.influence.toJSON(),
      totalCapitalEarned: currency.totalCapitalEarned.toJSON(),
      totalCognitiveEarned: currency.totalCognitiveEarned.toJSON(),
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

function parseSavedAt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function parseStress(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function parseSkills(raw: unknown): SkillSnapshot {
  const skills = (raw && typeof raw === 'object' ? raw : {}) as Partial<SkillSnapshot>;
  return {
    levels: skills.levels && typeof skills.levels === 'object' ? skills.levels : {},
    purchasedUpgrades: Array.isArray(skills.purchasedUpgrades) ? skills.purchasedUpgrades : [],
    currentRank: typeof skills.currentRank === 'number' ? skills.currentRank : 0,
  };
}

/**
 * v1 → v2: balances carry over, the rank moves to its v2 index, and every v1 skill level and
 * upgrade is refunded in Capital because those ids are gone. Lifetime Cognitive starts at the
 * current balance (v1 never tracked it).
 */
function migrateV1(save: Partial<GameSaveV1>): GameSave {
  const currency = (save.currency ?? {}) as Partial<SerializedCurrencyV1>;
  const skills = (save.skills && typeof save.skills === 'object' ? save.skills : {}) as Partial<SkillSnapshot>;
  const cognitive = nonNegative(currency.cognitive);
  return {
    savedAt: parseSavedAt(save.savedAt),
    currency: {
      capital: nonNegative(currency.capital).add(getV1Refund(skills.levels, skills.purchasedUpgrades)),
      cognitive,
      influence: nonNegative(currency.influence),
      totalCapitalEarned: nonNegative(currency.totalCapitalEarned),
      totalCognitiveEarned: cognitive,
      stress: parseStress(currency.stress),
    },
    skills: { levels: {}, purchasedUpgrades: [], currentRank: mapV1Rank(skills.currentRank) },
  };
}

function parseV2(save: Partial<GameSaveV2>): GameSave {
  const currency = (save.currency ?? {}) as Partial<GameSaveV2['currency']>;
  return {
    savedAt: parseSavedAt(save.savedAt),
    currency: {
      capital: nonNegative(currency.capital),
      cognitive: nonNegative(currency.cognitive),
      influence: nonNegative(currency.influence),
      totalCapitalEarned: nonNegative(currency.totalCapitalEarned),
      totalCognitiveEarned: nonNegative(currency.totalCognitiveEarned),
      stress: parseStress(currency.stress),
    },
    skills: parseSkills(save.skills),
  };
}

/**
 * Parse a stored save, migrating older versions. Returns null for missing, corrupt or unknown-version
 * data so the caller starts a fresh game instead of crashing. Skill values are sanitized by the skill store.
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
  const save = data as { version?: unknown; currency?: unknown };
  if (!save.currency || typeof save.currency !== 'object') return null;

  if (save.version === 1) return migrateV1(data as Partial<GameSaveV1>);
  if (save.version === SAVE_VERSION) return parseV2(data as Partial<GameSaveV2>);
  return null;
}
