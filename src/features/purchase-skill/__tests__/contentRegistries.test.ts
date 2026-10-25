import {
  BRANCH_RESOURCE,
  SKILLS,
  TECH_UPGRADES,
  UPGRADES,
  skillById,
  type ProducerSkill,
  type SkillBranch,
  type SkillResource,
} from '@entities/skill';
import { CAREER_RANKS, RESOURCE_UNLOCK_RANK, isResourceUnlocked } from '@entities/career-rank';
import en from '@shared/i18n/locales/en.json';
import uk from '@shared/i18n/locales/uk.json';
import es from '@shared/i18n/locales/es.json';

type Tree = Record<string, unknown>;

function lookup(tree: Tree, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (
    node && typeof node === 'object' ? (node as Tree)[part] : undefined
  ), tree);
}

describe('content registries (docs/economy/phases.md)', () => {
  it('has unique ids across skills and upgrades', () => {
    const ids = [...SKILLS.map((skill) => skill.id), ...UPGRADES.map((upgrade) => upgrade.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every producer exactly the resource of its branch', () => {
    SKILLS.forEach((skill) => {
      if (skill.kind === 'producer') expect(skill.produces).toBe(BRANCH_RESOURCE[skill.branch]);
      else expect(skill.maxLevel).toBeGreaterThan(0);
    });
  });

  it('only prices and produces resources the player already has at that rank', () => {
    SKILLS.forEach((skill) => {
      expect(isResourceUnlocked(skill.costResource, skill.unlockRank)).toBe(true);
      if (skill.kind === 'producer') expect(isResourceUnlocked(skill.produces, skill.unlockRank)).toBe(true);
    });
    UPGRADES.forEach((upgrade) => {
      expect(isResourceUnlocked(upgrade.costResource, upgrade.unlockRank)).toBe(true);
    });
  });

  it('points prerequisites at skills that are visible no later than the skill itself', () => {
    SKILLS.forEach((skill) => {
      skill.prerequisites?.forEach((requirement) => {
        const target = skillById(requirement.skillId);
        expect(target).toBeDefined();
        expect(target!.unlockRank).toBeLessThanOrEqual(skill.unlockRank);
      });
    });
    UPGRADES.forEach((upgrade) => {
      if (upgrade.requiredSkill) expect(skillById(upgrade.requiredSkill.skillId)).toBeDefined();
      if (upgrade.effect.type === 'skillMultiplier') expect(skillById(upgrade.effect.skillId)).toBeDefined();
    });
  });

  it('never gates a rank on a skill that only unlocks on that rank or later', () => {
    // The phase prototype hit exactly this deadlock: Junior required a skill unlocked on Junior.
    CAREER_RANKS.forEach((rank) => {
      rank.requirements.forEach((requirement) => {
        if (requirement.type !== 'skillLevel') return;
        const skill = skillById(requirement.skillId);
        expect(skill).toBeDefined();
        expect(skill!.unlockRank).toBeLessThan(rank.id);
      });
    });
  });

  it('numbers ranks in order and never lowers an earned target', () => {
    const lastTarget: Record<string, number> = {};
    CAREER_RANKS.forEach((rank, index) => {
      expect(rank.id).toBe(index);
      rank.requirements.forEach((requirement) => {
        if (requirement.type !== 'earned') return;
        const amount = requirement.amount.toNumber();
        expect(amount).toBeGreaterThanOrEqual(lastTarget[requirement.resource] ?? 0);
        lastTarget[requirement.resource] = amount;
      });
    });
    expect(CAREER_RANKS[0].requirements).toEqual([]);
  });

  it('gives every resource somewhere to be spent', () => {
    const sinks = new Set<SkillResource>([
      ...SKILLS.map((skill) => skill.costResource),
      ...UPGRADES.map((upgrade) => upgrade.costResource),
      ...CAREER_RANKS.flatMap((rank) => rank.requirements.flatMap((requirement) => (
        requirement.type === 'spend' ? [requirement.resource] : []
      ))),
    ]);
    (Object.keys(RESOURCE_UNLOCK_RANK) as SkillResource[]).forEach((resource) => {
      expect(sinks.has(resource)).toBe(true);
    });
  });

  const producers = SKILLS.filter((skill): skill is ProducerSkill => skill.kind === 'producer');

  it('fills Middle → Tech Lead with new rungs in every open branch (phases.md §5.5)', () => {
    // One new skill per branch per rank left 2–5 minute pauses without a purchase; stage 4 adds fillers.
    [5, 6, 7].forEach((rank) => {
      (['knowledge', 'work', 'influence'] as SkillBranch[]).forEach((branch) => {
        const fresh = producers.filter((skill) => skill.branch === branch && skill.unlockRank === rank);
        expect([rank, branch, fresh.length >= 2]).toEqual([rank, branch, true]);
      });
    });
  });

  it('keeps every branch a ladder without huge price jumps on ranks 5–7', () => {
    (['knowledge', 'work', 'influence'] as SkillBranch[]).forEach((branch) => {
      const ladder = producers
        .filter((skill) => skill.branch === branch && skill.unlockRank >= 5 && skill.unlockRank <= 7)
        .map((skill) => skill.baseCost)
        .sort((a, b) => a.compareTo(b));
      ladder.slice(1).forEach((cost, index) => {
        expect(cost.divide(ladder[index]).toNumber()).toBeLessThanOrEqual(6);
      });
    });
  });

  it('prices tech upgrades from real knowledge, also for work skills gated by work skills', () => {
    const knowledgeBases = producers.filter((skill) => skill.branch === 'knowledge').map((skill) => skill.baseCost);
    TECH_UPGRADES.filter((upgrade) => upgrade.costResource === 'cognitive').forEach((upgrade) => {
      // Tier 1 costs 25 × the base of the knowledge skill behind the upgraded skill.
      if (upgrade.tier !== 1) return;
      const pricedFromKnowledge = knowledgeBases.some((base) => base.multiplyScalar(25).eq(upgrade.cost));
      expect([upgrade.id, pricedFromKnowledge]).toEqual([upgrade.id, true]);
    });
    const legacy = TECH_UPGRADES.find((upgrade) => upgrade.id === 'legacy-php-opt-1');
    const petProjectBasis = skillById('algorithms')!.baseCost.multiplyScalar(25);
    expect(legacy?.cost.eq(petProjectBasis)).toBe(true);
  });

  it('has player-facing names for all content in every locale', () => {
    const keys = [
      ...SKILLS.flatMap((skill) => [`skills.items.${skill.id}.name`, `skills.items.${skill.id}.desc`]),
      ...UPGRADES.filter((upgrade) => upgrade.kind === 'leadership').map((upgrade) => `skills.leadership.${upgrade.id}.name`),
      ...TECH_UPGRADES.map((upgrade) => {
        const target = upgrade.effect.type === 'skillMultiplier' ? skillById(upgrade.effect.skillId) : undefined;
        return `skills.upgradeTiers.${target?.branch}.${upgrade.tier}`;
      }),
      ...CAREER_RANKS.flatMap((rank) => [`career.ranks.${rank.id}.title`, `career.ranks.${rank.id}.desc`]),
      ...Object.keys(BRANCH_RESOURCE).map((branch) => `skills.branches.${branch}`),
      ...['Cognitive', 'Capital', 'Influence'].map((resource) => `workspace.hint${resource}`),
    ];
    [en, uk, es].forEach((locale) => {
      keys.forEach((key) => {
        expect([key, typeof lookup(locale as Tree, key)]).toEqual([key, 'string']);
      });
    });
  });
});
