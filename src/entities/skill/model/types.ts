import type { Decimal } from '@shared/lib/decimal';

/** Spendable resources a skill can produce or cost. Stress is a meter, never a skill resource. */
export type SkillResource = 'cognitive' | 'capital' | 'influence';

/** Where a skill lives in the catalog: Knowledge pays in Cognitive, Work and Influence in Capital. */
export type SkillBranch = 'knowledge' | 'work' | 'influence';

export interface SkillPrerequisite {
  skillId: string;
  level: number;
}

interface SkillBase {
  id: string;
  branch: SkillBranch;
  /** First career rank on which the skill is visible and buyable. */
  unlockRank: number;
  costResource: SkillResource;
  baseCost: Decimal;
  costGrowth: number;
  prerequisites?: SkillPrerequisite[];
  maxLevel?: number;
}

/** One skill, one effect: a producer makes exactly one resource per second. */
export interface ProducerSkill extends SkillBase {
  kind: 'producer';
  produces: SkillResource;
  perLevel: Decimal;
}

export type PerkEffect =
  | { type: 'tapPower'; resources: readonly SkillResource[]; perLevel: number }
  | { type: 'stressReduction'; perLevel: number };

/** A perk changes one rule (tap power, stress) and produces nothing on its own. */
export interface PerkSkill extends SkillBase {
  kind: 'perk';
  effect: PerkEffect;
  maxLevel: number;
}

export type SkillDefinition = ProducerSkill | PerkSkill;

export type UpgradeEffect =
  | { type: 'skillMultiplier'; skillId: string; multiplier: number }
  | { type: 'branchMultiplier'; branch: SkillBranch; multiplier: number };

/** One-off purchase: a tech upgrade boosts one skill, a leadership perk boosts a whole branch. */
export interface Upgrade {
  id: string;
  kind: 'tech' | 'leadership';
  unlockRank: number;
  costResource: SkillResource;
  cost: Decimal;
  requiredSkill?: SkillPrerequisite;
  effect: UpgradeEffect;
  /** Tech upgrades are numbered per skill (1..4); used for display names. */
  tier?: number;
}
