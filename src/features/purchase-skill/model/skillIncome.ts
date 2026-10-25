import { Decimal } from '@shared/lib/decimal';
import {
  SKILLS,
  calculateProducerOutputs,
  calculateSkillEffects,
  getTapStressMultiplier,
  skillById,
  upgradeById,
  type SkillBranch,
  type SkillResource,
} from '@entities/skill';
import { TAP_BASE, type ResourceRates } from '@entities/currency';

/** The slice of game state the income functions need; the skill store exposes exactly these fields. */
export interface SkillIncomeState {
  levels: Record<string, number>;
  purchasedUpgrades: string[];
}

const RESOURCES: readonly SkillResource[] = ['capital', 'cognitive', 'influence'];
const PER_SEC = { capital: 'capitalPerSec', cognitive: 'cognitivePerSec', influence: 'influencePerSec' } as const;
const PER_CLICK = { capital: 'capitalPerClick', cognitive: 'cognitivePerClick', influence: 'influencePerClick' } as const;

/** The one place rates are derived from skills: real rates, previews and contributions all use it. */
export function calculateRates(levels: Record<string, number>, purchasedUpgrades: string[]): ResourceRates {
  const effects = calculateSkillEffects(levels, purchasedUpgrades);
  return {
    capitalPerSec: effects.capitalPerSec,
    cognitivePerSec: effects.cognitivePerSec,
    influencePerSec: effects.influencePerSec,
    capitalPerClick: TAP_BASE.capital.multiplyScalar(effects.tapMultiplier.capital),
    cognitivePerClick: TAP_BASE.cognitive.multiplyScalar(effects.tapMultiplier.cognitive),
    influencePerClick: TAP_BASE.influence.multiplyScalar(effects.tapMultiplier.influence),
    stressPerClickMultiplier: getTapStressMultiplier(effects.stressReduction),
  };
}

export interface RateChange {
  /** Extra passive income per second, per resource. */
  perSec: Record<SkillResource, Decimal>;
  /** Extra base value of one tap (perks), per resource. */
  perTap: Record<SkillResource, Decimal>;
  /** How much less stress one tap causes, as a share 0..1 of the current stress per tap. */
  stressPerTapReduction: number;
}

function diffRates(after: ResourceRates, before: ResourceRates): RateChange {
  const perSec = {} as Record<SkillResource, Decimal>;
  const perTap = {} as Record<SkillResource, Decimal>;
  for (const resource of RESOURCES) {
    const secGain = after[PER_SEC[resource]].subtract(before[PER_SEC[resource]]);
    const tapGain = after[PER_CLICK[resource]].subtract(before[PER_CLICK[resource]]);
    perSec[resource] = secGain.isPositive() ? secGain : Decimal.ZERO;
    perTap[resource] = tapGain.isPositive() ? tapGain : Decimal.ZERO;
  }
  const stressBefore = before.stressPerClickMultiplier;
  const stressPerTapReduction = stressBefore > 0
    ? Math.max(0, 1 - after.stressPerClickMultiplier / stressBefore)
    : 0;
  return { perSec, perTap, stressPerTapReduction };
}

function producerChange(resource: SkillResource, perSecGain: Decimal): RateChange {
  const perSec = { capital: Decimal.ZERO, cognitive: Decimal.ZERO, influence: Decimal.ZERO };
  perSec[resource] = perSecGain.isPositive() ? perSecGain : Decimal.ZERO;
  return { perSec, perTap: { capital: Decimal.ZERO, cognitive: Decimal.ZERO, influence: Decimal.ZERO }, stressPerTapReduction: 0 };
}

function ratesOf(state: SkillIncomeState): ResourceRates {
  return calculateRates(state.levels, state.purchasedUpgrades);
}

function clampLevels(skillId: string, current: number, levels: number): number {
  const skill = skillById(skillId);
  const wanted = Math.max(0, Math.floor(Number.isFinite(levels) ? levels : 0));
  if (!skill) return 0;
  return skill.maxLevel === undefined ? wanted : Math.max(0, Math.min(wanted, skill.maxLevel - current));
}

/**
 * Rates after buying `levels` more levels minus rates now, through the same function as the real
 * rates, so upgrades, milestone thresholds (25/50/100/200) and perks are included automatically.
 */
export function previewSkillGain(state: SkillIncomeState, skillId: string, levels: number): RateChange {
  const current = state.levels[skillId] ?? 0;
  const bought = clampLevels(skillId, current, levels);
  const skill = skillById(skillId);
  if (skill?.kind === 'producer') {
    // A producer changes only its own output; skip the full rate recalculation (catalog renders often).
    const before = calculateProducerOutputs(state.levels, state.purchasedUpgrades, [skillId])[skillId];
    const after = calculateProducerOutputs({ ...state.levels, [skillId]: current + bought }, state.purchasedUpgrades, [skillId])[skillId];
    return producerChange(skill.produces, after.subtract(before));
  }
  const after = calculateRates({ ...state.levels, [skillId]: current + bought }, state.purchasedUpgrades);
  return diffRates(after, ratesOf(state));
}

export interface SkillContribution extends RateChange {
  resource: SkillResource | null;
  /** Share (0..1) of the resource's passive income this skill makes now; null for perks. */
  share: number | null;
}

/** Ratio of two non-negative Decimals as a plain 0..1 number, safe for values beyond 1e308. */
export function decimalShare(part: Decimal, total: Decimal): number {
  if (!total.isPositive() || !part.isPositive()) return 0;
  const ratio = part.divide(total);
  if (ratio.gte(1)) return 1;
  // A ratio below 1 is a bounded number, but 1e-400 would underflow: treat it as nothing.
  return ratio.exponent < -6 ? 0 : ratio.toNumber();
}

/** What a skill adds right now: rates now minus rates with the skill at level 0. */
export function getSkillContribution(state: SkillIncomeState, skillId: string): SkillContribution {
  const skill = skillById(skillId);
  const now = ratesOf(state);
  if (skill?.kind === 'producer') {
    // Producers are independent: what one adds is exactly its own output.
    const output = calculateProducerOutputs(state.levels, state.purchasedUpgrades, [skillId])[skillId];
    return {
      ...producerChange(skill.produces, output),
      resource: skill.produces,
      share: decimalShare(output, now[PER_SEC[skill.produces]]),
    };
  }
  const without = calculateRates({ ...state.levels, [skillId]: 0 }, state.purchasedUpgrades);
  return { ...diffRates(now, without), resource: null, share: null };
}

export interface UpgradePreview {
  resource: SkillResource;
  /** Output the upgrade multiplies (the skill, or the whole branch) per second, now. */
  before: Decimal;
  /** The same output once the upgrade is owned. */
  after: Decimal;
  /** The skill it boosts; null for a branch-wide leadership upgrade. */
  skillId: string | null;
}

/** Output of the given producers per second, from one pass over the skills (producers are independent). */
function outputOf(outputs: Record<string, Decimal>, skillIds: readonly string[]): Decimal {
  return skillIds.reduce((sum, id) => sum.add(outputs[id] ?? Decimal.ZERO), Decimal.ZERO);
}

function branchProducers(branch: SkillBranch, resource: SkillResource): string[] {
  return SKILLS.filter((skill) => skill.branch === branch && skill.kind === 'producer' && skill.produces === resource)
    .map((skill) => skill.id);
}

/** "Async: $9/s → $27/s": the boosted output before and after buying the upgrade. */
export function previewUpgrade(state: SkillIncomeState, upgradeId: string): UpgradePreview | null {
  const upgrade = upgradeById(upgradeId);
  if (!upgrade) return null;
  const without = state.purchasedUpgrades.filter((id) => id !== upgradeId);
  const { effect } = upgrade;
  // Only the producers this upgrade touches are recomputed: the catalog previews ~150 upgrades at once.
  const touched = effect.type === 'skillMultiplier'
    ? [effect.skillId]
    : SKILLS.filter((skill) => skill.branch === effect.branch).map((skill) => skill.id);
  const outputsBefore = calculateProducerOutputs(state.levels, without, touched);
  const outputsAfter = calculateProducerOutputs(state.levels, [...without, upgradeId], touched);
  if (effect.type === 'skillMultiplier') {
    const skill = skillById(effect.skillId);
    if (!skill || skill.kind !== 'producer') return null;
    const ids = [skill.id];
    return {
      resource: skill.produces,
      before: outputOf(outputsBefore, ids),
      after: outputOf(outputsAfter, ids),
      skillId: skill.id,
    };
  }
  // A branch boost can touch several resources; the card shows the main one (the one it has most of).
  const candidates = RESOURCES.map((resource) => {
    const ids = branchProducers(effect.branch, resource);
    return {
      resource,
      ids,
      before: outputOf(outputsBefore, ids),
      after: outputOf(outputsAfter, ids),
    };
  }).filter((entry) => entry.ids.length > 0);
  const main = candidates.reduce((best, entry) => (entry.after.gt(best.after) ? entry : best), candidates[0]);
  if (!main) return null;
  return { resource: main.resource, before: main.before, after: main.after, skillId: null };
}
