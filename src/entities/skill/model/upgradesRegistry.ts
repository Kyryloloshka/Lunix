import { Decimal } from '@shared/lib/decimal';
import { SKILLS } from './skillRegistry';
import type { ProducerSkill, Upgrade } from './types';

/** Tech upgrade tiers for Knowledge and Work skills: paid in Cognitive, priced from the knowledge behind the skill. */
const TECH_TIERS = [
  { level: 10, multiplier: 2, costFactor: 25 },
  { level: 25, multiplier: 1.5, costFactor: 120 },
  { level: 40, multiplier: 2, costFactor: 400 },
  { level: 60, multiplier: 1.5, costFactor: 2_500 },
] as const;

/** Influence skills upgrade with Influence itself; priced from the skill's per-level output. */
const INFLUENCE_TIERS = [
  { level: 10, multiplier: 2, costFactor: 400 },
  { level: 25, multiplier: 2, costFactor: 3_000 },
] as const;

const producers = SKILLS.filter((skill): skill is ProducerSkill => skill.kind === 'producer');

/** The knowledge skill whose base cost prices a skill's tech upgrades (own base for knowledge skills). */
function knowledgeBasis(skill: ProducerSkill, depth = 0): ProducerSkill {
  if (skill.branch === 'knowledge') return skill;
  const required = (skill.prerequisites ?? [])
    .map((requirement) => producers.find((candidate) => candidate.id === requirement.skillId))
    .filter((candidate): candidate is ProducerSkill => candidate !== undefined);
  const knowledgeRequirement = required.find((candidate) => candidate.branch === 'knowledge');
  if (knowledgeRequirement) return knowledgeRequirement;
  // A work skill gated by another work skill prices from that skill's knowledge (own-cloud → ai-startup → ml).
  const workRequirement = required.find((candidate) => candidate.branch === 'work');
  if (workRequirement && depth < producers.length) return knowledgeBasis(workRequirement, depth + 1);
  return producers.filter((candidate) => candidate.branch === 'knowledge').at(-1)!;
}

function buildTechUpgrades(): Upgrade[] {
  return producers.flatMap((skill): Upgrade[] => {
    if (skill.branch === 'influence') {
      return INFLUENCE_TIERS.map((tier, index) => ({
        id: `${skill.id}-opt-${index + 1}`,
        kind: 'tech' as const,
        tier: index + 1,
        unlockRank: skill.unlockRank,
        costResource: 'influence' as const,
        cost: skill.perLevel.multiplyScalar(tier.costFactor),
        requiredSkill: { skillId: skill.id, level: tier.level },
        effect: { type: 'skillMultiplier' as const, skillId: skill.id, multiplier: tier.multiplier },
      }));
    }
    const basis = knowledgeBasis(skill).baseCost;
    return TECH_TIERS.map((tier, index) => ({
      id: `${skill.id}-opt-${index + 1}`,
      kind: 'tech' as const,
      tier: index + 1,
      unlockRank: skill.unlockRank,
      costResource: 'cognitive' as const,
      cost: basis.multiplyScalar(tier.costFactor),
      requiredSkill: { skillId: skill.id, level: tier.level },
      effect: { type: 'skillMultiplier' as const, skillId: skill.id, multiplier: tier.multiplier },
    }));
  });
}

const D = (value: number) => Decimal.from(value);

/** One-off Influence purchases that multiply a whole branch. */
export const LEADERSHIP_PERKS: Upgrade[] = [
  { id: 'delegation', kind: 'leadership', unlockRank: 6, costResource: 'influence', cost: D(150), effect: { type: 'branchMultiplier', branch: 'work', multiplier: 2 } },
  { id: 'mentoring', kind: 'leadership', unlockRank: 6, costResource: 'influence', cost: D(600), effect: { type: 'branchMultiplier', branch: 'knowledge', multiplier: 2 } },
  { id: 'senior-hiring', kind: 'leadership', unlockRank: 7, costResource: 'influence', cost: D(12_000), effect: { type: 'branchMultiplier', branch: 'work', multiplier: 3 } },
  { id: 'learning-budget', kind: 'leadership', unlockRank: 7, costResource: 'influence', cost: D(50_000), effect: { type: 'branchMultiplier', branch: 'knowledge', multiplier: 3 } },
  { id: 'okr', kind: 'leadership', unlockRank: 8, costResource: 'influence', cost: D(6e5), effect: { type: 'branchMultiplier', branch: 'work', multiplier: 4 } },
  { id: 'board-seat', kind: 'leadership', unlockRank: 9, costResource: 'influence', cost: D(1e7), effect: { type: 'branchMultiplier', branch: 'work', multiplier: 5 } },
];

export const TECH_UPGRADES: Upgrade[] = buildTechUpgrades();

export const UPGRADES: Upgrade[] = [...TECH_UPGRADES, ...LEADERSHIP_PERKS];

export const upgradeById = (id: string): Upgrade | undefined => UPGRADES.find((upgrade) => upgrade.id === id);
