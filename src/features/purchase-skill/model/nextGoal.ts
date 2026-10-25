import { Decimal } from '@shared/lib/decimal';
import {
  SKILLS,
  UPGRADES,
  getSkillCost,
  type SkillDefinition,
  type SkillResource,
  type Upgrade,
} from '@entities/skill';
import {
  CAREER_RANKS,
  MAX_RANK,
  clampRank,
  getRankProgress,
  getRequirementRatio,
  type RankProgressContext,
  type RequirementProgress,
} from '@entities/career-rank';
import { isSkillUnlocked } from './skillStore';

/** Tab the goal points at: where the player acts to move it forward. */
export type NextGoalTab = 'work' | 'skills' | 'career';

interface GoalBase {
  tab: NextGoalTab;
  resource: SkillResource;
  current: Decimal;
  target: Decimal;
  /** 0..1, computed by Decimal division so it stays finite past 1e308. */
  ratio: number;
  /** The player can act on it right now (afford the purchase / claim the promotion). */
  ready: boolean;
}

/** What the player sees as the one nearest thing to do. Plain data: the UI only renders it. */
export type NextGoal =
  /** Buy the next level of a skill (a rank requirement, or the closest purchase at the top rank). */
  | (GoalBase & { kind: 'buySkill'; skillId: string; level: number })
  /** Buy an available upgrade (top-rank fallback; its name is shown in the Stack tab). */
  | (GoalBase & { kind: 'buyUpgrade'; upgradeId: string })
  /** Lifetime earnings requirement of the next rank. */
  | (GoalBase & { kind: 'earn'; rankId: number })
  /** Influence the next rank consumes. */
  | (GoalBase & { kind: 'spend'; rankId: number })
  /** Every requirement is met: claim the promotion. */
  | (GoalBase & { kind: 'promote'; rankId: number });

export interface NextGoalState {
  rank: number;
  levels: Record<string, number>;
  purchasedUpgrades: readonly string[];
  balances: Record<SkillResource, Decimal>;
  /** Lifetime totals, what rank requirements of type `earned` read. */
  earned: Record<'cognitive' | 'capital', Decimal>;
}

export interface NextGoalContent {
  skills: readonly SkillDefinition[];
  upgrades: readonly Upgrade[];
}

const DEFAULT_CONTENT: NextGoalContent = { skills: SKILLS, upgrades: UPGRADES };

function ratioOf(current: Decimal, target: Decimal): number {
  if (!target.isPositive() || current.gte(target)) return 1;
  if (!current.isPositive()) return 0;
  const ratio = current.divide(target).toNumber();
  return Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
}

/** Cost of the next level of `skill`, or null when the skill is maxed. */
export function getNextLevelCost(skill: SkillDefinition, level: number): Decimal | null {
  if (skill.maxLevel !== undefined && level >= skill.maxLevel) return null;
  return getSkillCost(skill.baseCost, skill.costGrowth, level);
}

function skillGoal(skill: SkillDefinition, state: NextGoalState): NextGoal | null {
  const level = state.levels[skill.id] ?? 0;
  const cost = getNextLevelCost(skill, level);
  if (cost === null) return null;
  const current = state.balances[skill.costResource];
  return {
    kind: 'buySkill',
    skillId: skill.id,
    level: level + 1,
    tab: 'skills',
    resource: skill.costResource,
    current,
    target: cost,
    ratio: ratioOf(current, cost),
    ready: current.gte(cost),
  };
}

/**
 * The skill the player has to buy for `skillId` to reach `level`: the skill itself, or the first
 * unmet prerequisite below it. Null when nothing can be bought (locked by rank, or already there).
 */
function resolveSkillToBuy(
  skillId: string,
  level: number,
  state: NextGoalState,
  content: NextGoalContent,
  depth = 0,
): SkillDefinition | null {
  const skill = content.skills.find((item) => item.id === skillId);
  if (!skill || depth > content.skills.length || skill.unlockRank > state.rank) return null;
  if ((state.levels[skillId] ?? 0) >= level) return null;
  for (const need of skill.prerequisites ?? []) {
    if ((state.levels[need.skillId] ?? 0) < need.level) {
      return resolveSkillToBuy(need.skillId, need.level, state, content, depth + 1);
    }
  }
  return skill;
}

function rankContext(state: NextGoalState): RankProgressContext {
  return { earned: state.earned, balance: state.balances, levels: state.levels };
}

function requirementGoal(
  item: RequirementProgress,
  rankId: number,
  state: NextGoalState,
  content: NextGoalContent,
): NextGoal | null {
  const { requirement } = item;
  if (requirement.type === 'skillLevel') {
    const skill = resolveSkillToBuy(requirement.skillId, requirement.level, state, content);
    return skill ? skillGoal(skill, state) : null;
  }
  const base = {
    tab: 'work' as const,
    resource: requirement.resource,
    current: item.current,
    target: item.target,
    ratio: getRequirementRatio(item),
    ready: false,
  };
  return requirement.type === 'earned'
    ? { ...base, kind: 'earn', rankId }
    : { ...base, kind: 'spend', rankId };
}

function isUpgradeAvailable(upgrade: Upgrade, state: NextGoalState): boolean {
  if (state.purchasedUpgrades.includes(upgrade.id) || upgrade.unlockRank > state.rank) return false;
  const required = upgrade.requiredSkill;
  return !required || (state.levels[required.skillId] ?? 0) >= required.level;
}

/** Top-rank fallback: the purchase closest to being affordable (ties keep registry order). */
function closestPurchase(state: NextGoalState, content: NextGoalContent): NextGoal | null {
  const candidates: NextGoal[] = [];
  for (const skill of content.skills) {
    if (!isSkillUnlocked(skill.id, state.levels, state.rank)) continue;
    const goal = skillGoal(skill, state);
    if (goal) candidates.push(goal);
  }
  for (const upgrade of content.upgrades) {
    if (!isUpgradeAvailable(upgrade, state)) continue;
    const current = state.balances[upgrade.costResource];
    candidates.push({
      kind: 'buyUpgrade',
      upgradeId: upgrade.id,
      tab: 'skills',
      resource: upgrade.costResource,
      current,
      target: upgrade.cost,
      ratio: ratioOf(current, upgrade.cost),
      ready: current.gte(upgrade.cost),
    });
  }
  let best: NextGoal | null = null;
  for (const goal of candidates) {
    if (best === null || goal.ratio > best.ratio) best = goal;
  }
  return best;
}

const REQUIREMENT_ORDER: Record<RequirementProgress['requirement']['type'], number> = {
  skillLevel: 0,
  earned: 1,
  spend: 2,
};

/**
 * The single nearest goal (T-003). Pure: reads only `state`. It never reveals hidden ranks: only the
 * rank directly after the current one is looked at, exactly like the Career ladder (T-008).
 *
 * Order for the next rank: missing skill levels (a skill chain is walked down to the first purchase
 * that is actually possible), then lifetime earnings, then Influence to spend; when everything is met
 * the goal is the promotion. At the top rank the goal is the purchase closest to affordable.
 * Null when there is nothing left to aim at.
 */
export function selectNextGoal(state: NextGoalState, content: NextGoalContent = DEFAULT_CONTENT): NextGoal | null {
  const rank = clampRank(state.rank);
  const normalized = rank === state.rank ? state : { ...state, rank };
  const nextRank = CAREER_RANKS[rank + 1];
  if (rank >= MAX_RANK || !nextRank) return closestPurchase(normalized, content);

  const unmet = getRankProgress(nextRank.id, rankContext(normalized)).filter((item) => !item.met);
  if (unmet.length === 0) {
    return {
      kind: 'promote',
      rankId: nextRank.id,
      tab: 'career',
      resource: 'capital',
      current: Decimal.ONE,
      target: Decimal.ONE,
      ratio: 1,
      ready: true,
    };
  }
  const sorted = [...unmet].sort((a, b) => REQUIREMENT_ORDER[a.requirement.type] - REQUIREMENT_ORDER[b.requirement.type]);
  for (const item of sorted) {
    const goal = requirementGoal(item, nextRank.id, normalized, content);
    if (goal) return goal;
  }
  return closestPurchase(normalized, content);
}

/** Dock badge for the Stack tab: at least one visible skill level or upgrade can be bought right now. */
export function hasAffordablePurchase(state: NextGoalState, content: NextGoalContent = DEFAULT_CONTENT): boolean {
  const rank = clampRank(state.rank);
  for (const skill of content.skills) {
    if (!isSkillUnlocked(skill.id, state.levels, rank)) continue;
    const cost = getNextLevelCost(skill, state.levels[skill.id] ?? 0);
    if (cost !== null && state.balances[skill.costResource].gte(cost)) return true;
  }
  return content.upgrades.some((upgrade) => (
    isUpgradeAvailable(upgrade, { ...state, rank }) && state.balances[upgrade.costResource].gte(upgrade.cost)
  ));
}

/** Dock badge for the Career tab: the next rank exists and every requirement of it is met. */
export function canPromoteNow(state: NextGoalState): boolean {
  const rank = clampRank(state.rank);
  const next = CAREER_RANKS[rank + 1];
  return Boolean(next) && getRankProgress(next.id, rankContext(state)).every((item) => item.met);
}
