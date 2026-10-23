import { create } from 'zustand';
import { Decimal } from '@shared/lib/decimal';
import {
  calculateBulkPurchase,
  getBulkSkillCost,
  INITIAL_SKILL_LEVELS,
  skillById,
  TECH_UPGRADES,
  type PurchaseMode,
} from '@entities/skill';
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

interface SkillStore {
  levels: Record<string, number>;
  purchasedUpgrades: string[];
  currentRank: number;
  buy: (id: string, capital: Decimal, mode?: PurchaseMode) => number;
  buyUpgrade: (id: string) => boolean;
  reset: () => void;
  setRank: (rank: number) => void;
}

export const useSkillStore = create<SkillStore>((set, get) => ({
  levels: INITIAL_SKILL_LEVELS,
  purchasedUpgrades: [],
  currentRank: 0,
  buy: (id, capital, mode = 1) => {
    const skill = skillById(id);
    const { levels, currentRank } = get();
    if (!skill || !isSkillUnlocked(id, levels, currentRank)) return 0;

    const level = levels[id] ?? 0;
    const remaining = skill.maxLevel === undefined ? undefined : skill.maxLevel - level;
    if (remaining !== undefined && remaining <= 0) return 0;

    const purchase = calculateBulkPurchase(skill.baseCost, skill.costGrowth, level, capital, mode);
    const quantity = remaining === undefined ? purchase.levels : Math.min(purchase.levels, remaining);
    if (quantity <= 0) return 0;

    const totalCost = getBulkSkillCost(skill.baseCost, skill.costGrowth, level, quantity);
    if (!useCurrencyStore.getState().spendResources({ capital: totalCost })) return 0;

    set((state) => ({ levels: { ...state.levels, [id]: level + quantity } }));
    return quantity;
  },
  buyUpgrade: (id: string) => {
    const { purchasedUpgrades, levels } = get();
    if (purchasedUpgrades.includes(id)) return false;

    const upgrade = TECH_UPGRADES.find((item) => item.id === id);
    if (!upgrade) return false;

    const currentSkillLevel = levels[upgrade.targetSkillId] ?? 0;
    if (currentSkillLevel < upgrade.requiredSkillLevel) return false;

    const currencyStore = useCurrencyStore.getState();
    const spent = upgrade.currency === 'capital'
      ? currencyStore.spendResources({ capital: upgrade.cost })
      : upgrade.currency === 'cognitive'
        ? currencyStore.spendResources({ cognitive: upgrade.cost })
        : currencyStore.spendResources({ influence: upgrade.cost });
    if (!spent) return false;

    set((state) => ({
      purchasedUpgrades: [...state.purchasedUpgrades, id],
    }));
    return true;
  },
  reset: () => set({ levels: INITIAL_SKILL_LEVELS, purchasedUpgrades: [], currentRank: 0 }),
  setRank: (rank) => set({ currentRank: Math.max(0, Math.floor(rank)) }),
}));

