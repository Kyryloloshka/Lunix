import { create } from 'zustand';
import { Decimal } from '@shared/lib/decimal';
import {
  calculateBulkPurchase,
  calculateSkillEffects,
  getBulkSkillCost,
  getTapStressMultiplier,
  INITIAL_SKILL_LEVELS,
  SKILLS,
  skillById,
  UPGRADES,
  upgradeById,
  type PurchaseMode,
  type SkillResource,
} from '@entities/skill';
import {
  areRankRequirementsMet,
  clampRank,
  getNewlyUnlockedResources,
  getRankProgress,
  getUnlockedResources,
  isResourceUnlocked,
  MAX_RANK,
  type RankProgressContext,
  type RequirementProgress,
} from '@entities/career-rank';
import { TAP_BASE, useCurrencyStore, type TapResult } from '@entities/currency';

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
    capitalPerClick: TAP_BASE.capital.multiplyScalar(effects.tapMultiplier.capital),
    cognitivePerClick: TAP_BASE.cognitive.multiplyScalar(effects.tapMultiplier.cognitive),
    influencePerClick: TAP_BASE.influence.multiplyScalar(effects.tapMultiplier.influence),
    stressPerClickMultiplier: getTapStressMultiplier(effects.stressReduction),
  });
}

function getProgressContext(levels: Record<string, number>): RankProgressContext {
  const currency = useCurrencyStore.getState();
  return {
    earned: { cognitive: currency.totalCognitiveEarned, capital: currency.totalCapitalEarned },
    balance: { cognitive: currency.cognitive, capital: currency.capital, influence: currency.influence },
    levels,
  };
}

/** Live progress toward a rank's requirements, read from the stores at call time. */
export function getPromotionProgress(rankId: number): RequirementProgress[] {
  return getRankProgress(rankId, getProgressContext(useSkillStore.getState().levels));
}

export function canPromote(nextRank: number): boolean {
  return areRankRequirementsMet(nextRank, getProgressContext(useSkillStore.getState().levels));
}

/** The newest resource the player has: taps follow it after a promotion and after loading a save. */
function latestUnlockedResource(rank: number): SkillResource {
  return getUnlockedResources(rank).at(-1) ?? 'cognitive';
}

export interface SkillSnapshot {
  levels: Record<string, number>;
  purchasedUpgrades: string[];
  currentRank: number;
}

interface SkillStore extends SkillSnapshot {
  /** Which resource a tap produces. UI state, not saved. */
  tapResource: SkillResource;
  /**
   * Resources opened by a promotion in this session, oldest first, waiting for their unlock card
   * (T-016 stage 5). An event queue, not saved: a resource unlocks on exactly one promotion, so the
   * card shows once per save without "seen" flags. Loading a save starts with an empty queue.
   */
  pendingResourceUnlocks: SkillResource[];
  buy: (id: string, mode?: PurchaseMode) => number;
  buyUpgrade: (id: string) => boolean;
  promote: () => boolean;
  setTapResource: (resource: SkillResource) => boolean;
  /** Removes the oldest pending unlock event (its card was shown) and returns it. */
  acknowledgeResourceUnlock: () => SkillResource | undefined;
  tap: () => TapResult;
  hydrate: (snapshot: SkillSnapshot) => void;
  reset: () => void;
}

function sanitizeSnapshot(snapshot: SkillSnapshot): SkillSnapshot {
  const levels = { ...INITIAL_SKILL_LEVELS };
  SKILLS.forEach((skill) => {
    const raw = snapshot.levels?.[skill.id];
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return;
    const level = Math.max(0, Math.floor(raw));
    levels[skill.id] = skill.maxLevel === undefined ? level : Math.min(level, skill.maxLevel);
  });
  const knownUpgrades = new Set(UPGRADES.map((upgrade) => upgrade.id));
  const purchasedUpgrades = Array.isArray(snapshot.purchasedUpgrades)
    ? [...new Set(snapshot.purchasedUpgrades.filter((id) => knownUpgrades.has(id)))]
    : [];
  return { levels, purchasedUpgrades, currentRank: clampRank(snapshot.currentRank) };
}

export const useSkillStore = create<SkillStore>((set, get) => ({
  levels: INITIAL_SKILL_LEVELS,
  purchasedUpgrades: [],
  currentRank: 0,
  tapResource: 'cognitive',
  pendingResourceUnlocks: [],
  buy: (id, mode = 1) => {
    const skill = skillById(id);
    const { levels, currentRank } = get();
    if (!skill || !isSkillUnlocked(id, levels, currentRank)) return 0;

    const level = levels[id] ?? 0;
    const remaining = skill.maxLevel === undefined ? undefined : skill.maxLevel - level;
    if (remaining !== undefined && remaining <= 0) return 0;

    // Read the live balance: a value captured during render can be stale.
    const budget = useCurrencyStore.getState()[skill.costResource];
    const purchase = calculateBulkPurchase(skill.baseCost, skill.costGrowth, level, budget, mode);
    const quantity = remaining === undefined ? purchase.levels : Math.min(purchase.levels, remaining);
    if (quantity <= 0) return 0;

    const totalCost = getBulkSkillCost(skill.baseCost, skill.costGrowth, level, quantity);
    if (!useCurrencyStore.getState().spendResources({ [skill.costResource]: totalCost })) return 0;

    set((state) => ({ levels: { ...state.levels, [id]: level + quantity } }));
    syncRatesFromSkills(get().levels, get().purchasedUpgrades);
    return quantity;
  },
  buyUpgrade: (id: string) => {
    const { purchasedUpgrades, levels, currentRank } = get();
    if (purchasedUpgrades.includes(id)) return false;

    const upgrade = upgradeById(id);
    if (!upgrade || upgrade.unlockRank > currentRank) return false;
    if (upgrade.requiredSkill && (levels[upgrade.requiredSkill.skillId] ?? 0) < upgrade.requiredSkill.level) return false;

    if (!useCurrencyStore.getState().spendResources({ [upgrade.costResource]: upgrade.cost })) return false;

    set((state) => ({
      purchasedUpgrades: [...state.purchasedUpgrades, id],
    }));
    syncRatesFromSkills(get().levels, get().purchasedUpgrades);
    return true;
  },
  promote: () => {
    const nextRank = get().currentRank + 1;
    if (nextRank > MAX_RANK || !canPromote(nextRank)) return false;

    // Leadership promotions consume Influence; earned totals and skill levels are only checked.
    const spend = getPromotionProgress(nextRank).reduce((total, { requirement }) => (
      requirement.type === 'spend' ? total.add(requirement.amount) : total
    ), Decimal.ZERO);
    if (spend.isPositive() && !useCurrencyStore.getState().spendResources({ influence: spend })) return false;

    const unlocked = getNewlyUnlockedResources(get().currentRank, nextRank);
    set({ currentRank: nextRank });
    if (unlocked.length > 0) {
      // A new resource is the point of this promotion: taps switch to it and the UI gets an event.
      set((state) => ({
        tapResource: latestUnlockedResource(nextRank),
        pendingResourceUnlocks: [...state.pendingResourceUnlocks, ...unlocked],
      }));
    }
    return true;
  },
  setTapResource: (resource) => {
    if (!isResourceUnlocked(resource, get().currentRank)) return false;
    set({ tapResource: resource });
    return true;
  },
  acknowledgeResourceUnlock: () => {
    const [first, ...rest] = get().pendingResourceUnlocks;
    if (first === undefined) return undefined;
    set({ pendingResourceUnlocks: rest });
    return first;
  },
  tap: () => {
    const { tapResource, currentRank } = get();
    const resource = isResourceUnlocked(tapResource, currentRank) ? tapResource : 'cognitive';
    return useCurrencyStore.getState().tap(resource);
  },
  hydrate: (snapshot) => {
    const sanitized = sanitizeSnapshot(snapshot);
    set({ ...sanitized, tapResource: latestUnlockedResource(sanitized.currentRank), pendingResourceUnlocks: [] });
    syncRatesFromSkills(sanitized.levels, sanitized.purchasedUpgrades);
  },
  reset: () => {
    set({ levels: INITIAL_SKILL_LEVELS, purchasedUpgrades: [], currentRank: 0, tapResource: 'cognitive', pendingResourceUnlocks: [] });
    syncRatesFromSkills(INITIAL_SKILL_LEVELS, []);
  },
}));
