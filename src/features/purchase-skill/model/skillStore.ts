import { create } from 'zustand';
import {
  calculateBulkPurchase,
  calculateSkillEffects,
  getBulkSkillCost,
  getTapStressMultiplier,
  INITIAL_SKILL_LEVELS,
  SKILLS,
  skillById,
  TECH_UPGRADES,
  type PurchaseMode,
} from '@entities/skill';
import { CAREER_RANKS } from '@entities/career-rank';
import { useCurrencyStore } from '@entities/currency';

export function isSkillUnlocked(
  id: string,
  levels: Record<string, number>,
  currentRank: number,
): boolean {
  const skill = skillById(id);
  if (!skill || skill.unlockRank > currentRank) return false;
  return skill.prerequisites?.every(
    (requirement) => (levels[requirement.skillId] ?? 0) >= requirement.level,
  ) ?? true;
}

/** Rates are derived from skills, so recompute them after every change instead of trusting UI to do it. */
export function syncRatesFromSkills(levels: Record<string, number>, purchasedUpgrades: string[]): void {
  const effects = calculateSkillEffects(levels, purchasedUpgrades);
  useCurrencyStore.getState().updateRates({
    capitalPerSec: effects.capitalPerSec,
    cognitivePerSec: effects.cognitivePerSec,
    influencePerSec: effects.influencePerSec,
    capitalPerClick: effects.capitalPerClick,
    stressPerClickMultiplier: getTapStressMultiplier(effects.stressReduction),
  });
}

export function canPromote(nextRank: number): boolean {
  const target = CAREER_RANKS[nextRank];
  if (!target) return false;
  const { totalCapitalEarned, influence } = useCurrencyStore.getState();
  return totalCapitalEarned.gte(target.requiredCapital) && influence.gte(target.requiredInfluence);
}

export interface SkillSnapshot {
  levels: Record<string, number>;
  purchasedUpgrades: string[];
  currentRank: number;
}

interface SkillStore extends SkillSnapshot {
  buy: (id: string, mode?: PurchaseMode) => number;
  buyUpgrade: (id: string) => boolean;
  promote: () => boolean;
  hydrate: (snapshot: SkillSnapshot) => void;
  reset: () => void;
}

const MAX_RANK = CAREER_RANKS.length - 1;

function sanitizeSnapshot(snapshot: SkillSnapshot): SkillSnapshot {
  const levels = { ...INITIAL_SKILL_LEVELS };
  SKILLS.forEach((skill) => {
    const raw = snapshot.levels?.[skill.id];
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return;
    const level = Math.max(0, Math.floor(raw));
    levels[skill.id] = skill.maxLevel === undefined ? level : Math.min(level, skill.maxLevel);
  });
  const knownUpgrades = new Set(TECH_UPGRADES.map((upgrade) => upgrade.id));
  const purchasedUpgrades = Array.isArray(snapshot.purchasedUpgrades)
    ? [...new Set(snapshot.purchasedUpgrades.filter((id) => knownUpgrades.has(id)))]
    : [];
  const rank = Number.isFinite(snapshot.currentRank) ? Math.floor(snapshot.currentRank) : 0;
  return { levels, purchasedUpgrades, currentRank: Math.min(MAX_RANK, Math.max(0, rank)) };
}

export const useSkillStore = create<SkillStore>((set, get) => ({
  levels: INITIAL_SKILL_LEVELS,
  purchasedUpgrades: [],
  currentRank: 0,
  buy: (id, mode = 1) => {
    const skill = skillById(id);
    const { levels, currentRank } = get();
    if (!skill || !isSkillUnlocked(id, levels, currentRank)) return 0;

    const level = levels[id] ?? 0;
    const remaining = skill.maxLevel === undefined ? undefined : skill.maxLevel - level;
    if (remaining !== undefined && remaining <= 0) return 0;

    // Read the live balance: a capital value captured during render can be stale.
    const capital = useCurrencyStore.getState().capital;
    const purchase = calculateBulkPurchase(skill.baseCost, skill.costGrowth, level, capital, mode);
    const quantity = remaining === undefined ? purchase.levels : Math.min(purchase.levels, remaining);
    if (quantity <= 0) return 0;

    const totalCost = getBulkSkillCost(skill.baseCost, skill.costGrowth, level, quantity);
    if (!useCurrencyStore.getState().spendResources({ capital: totalCost })) return 0;

    set((state) => ({ levels: { ...state.levels, [id]: level + quantity } }));
    syncRatesFromSkills(get().levels, get().purchasedUpgrades);
    return quantity;
  },
  buyUpgrade: (id: string) => {
    const { purchasedUpgrades, levels } = get();
    if (purchasedUpgrades.includes(id)) return false;

    const upgrade = TECH_UPGRADES.find((item) => item.id === id);
    if (!upgrade) return false;

    const currentSkillLevel = levels[upgrade.targetSkillId] ?? 0;
    if (currentSkillLevel < upgrade.requiredSkillLevel) return false;

    if (!useCurrencyStore.getState().spendResources({ [upgrade.currency]: upgrade.cost })) return false;

    set((state) => ({
      purchasedUpgrades: [...state.purchasedUpgrades, id],
    }));
    syncRatesFromSkills(get().levels, get().purchasedUpgrades);
    return true;
  },
  promote: () => {
    const nextRank = get().currentRank + 1;
    if (!canPromote(nextRank)) return false;
    set({ currentRank: nextRank });
    return true;
  },
  hydrate: (snapshot) => {
    const sanitized = sanitizeSnapshot(snapshot);
    set(sanitized);
    syncRatesFromSkills(sanitized.levels, sanitized.purchasedUpgrades);
  },
  reset: () => {
    set({ levels: INITIAL_SKILL_LEVELS, purchasedUpgrades: [], currentRank: 0 });
    syncRatesFromSkills(INITIAL_SKILL_LEVELS, []);
  },
}));
