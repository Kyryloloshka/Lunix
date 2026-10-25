import { Decimal } from '@shared/lib/decimal';
import type { SkillBranch, SkillDefinition, SkillResource } from './types';

const D = (value: number) => Decimal.from(value);

/** Branch → the resource its producers make. Influence skills are bought with Capital. */
export const BRANCH_RESOURCE: Record<SkillBranch, SkillResource> = {
  knowledge: 'cognitive',
  work: 'capital',
  influence: 'influence',
};

/**
 * Skill content for the three career phases. Numbers come from docs/economy/phases.md (approved
 * 2026-10-24); player-facing names live in i18n under skills.items.<id>.
 */
export const SKILLS: SkillDefinition[] = [
  // Knowledge: paid in Cognitive, produces Cognitive.
  { id: 'html-tags', kind: 'producer', branch: 'knowledge', unlockRank: 0, costResource: 'cognitive', baseCost: D(10), costGrowth: 1.15, produces: 'cognitive', perLevel: D(0.5) },
  { id: 'css-centering', kind: 'producer', branch: 'knowledge', unlockRank: 0, costResource: 'cognitive', baseCost: D(75), costGrowth: 1.15, produces: 'cognitive', perLevel: D(2.5), prerequisites: [{ skillId: 'html-tags', level: 3 }] },
  { id: 'js-basics', kind: 'producer', branch: 'knowledge', unlockRank: 1, costResource: 'cognitive', baseCost: D(600), costGrowth: 1.16, produces: 'cognitive', perLevel: D(9), prerequisites: [{ skillId: 'css-centering', level: 3 }] },
  { id: 'git', kind: 'producer', branch: 'knowledge', unlockRank: 2, costResource: 'cognitive', baseCost: D(2_500), costGrowth: 1.16, produces: 'cognitive', perLevel: D(35), prerequisites: [{ skillId: 'js-basics', level: 3 }] },
  { id: 'algorithms', kind: 'producer', branch: 'knowledge', unlockRank: 3, costResource: 'cognitive', baseCost: D(45_000), costGrowth: 1.17, produces: 'cognitive', perLevel: D(280), prerequisites: [{ skillId: 'git', level: 5 }] },
  { id: 'reakt', kind: 'producer', branch: 'knowledge', unlockRank: 4, costResource: 'cognitive', baseCost: D(5e5), costGrowth: 1.17, produces: 'cognitive', perLevel: D(1_800), prerequisites: [{ skillId: 'algorithms', level: 5 }] },
  { id: 'nodle', kind: 'producer', branch: 'knowledge', unlockRank: 5, costResource: 'cognitive', baseCost: D(6e6), costGrowth: 1.18, produces: 'cognitive', perLevel: D(12_000), prerequisites: [{ skillId: 'reakt', level: 5 }] },
  { id: 'dokker', kind: 'producer', branch: 'knowledge', unlockRank: 6, costResource: 'cognitive', baseCost: D(8e7), costGrowth: 1.18, produces: 'cognitive', perLevel: D(80_000), prerequisites: [{ skillId: 'nodle', level: 5 }] },
  { id: 'distributed-systems', kind: 'producer', branch: 'knowledge', unlockRank: 7, costResource: 'cognitive', baseCost: D(1.2e9), costGrowth: 1.19, produces: 'cognitive', perLevel: D(6e5), prerequisites: [{ skillId: 'dokker', level: 5 }] },
  // Stage 4 fillers (phases.md §5.5): one or two rungs between neighbours on ranks 5–7 so the
  // Middle → Tech Lead stretch never waits more than ~90 s for the next purchase.
  { id: 'typescrypt', kind: 'producer', branch: 'knowledge', unlockRank: 5, costResource: 'cognitive', baseCost: D(1.1e6), costGrowth: 1.17, produces: 'cognitive', perLevel: D(5_600), prerequisites: [{ skillId: 'reakt', level: 3 }] },
  { id: 'sql-indexes', kind: 'producer', branch: 'knowledge', unlockRank: 5, costResource: 'cognitive', baseCost: D(2.6e6), costGrowth: 1.17, produces: 'cognitive', perLevel: D(11_000), prerequisites: [{ skillId: 'reakt', level: 3 }] },
  { id: 'design-patterns', kind: 'producer', branch: 'knowledge', unlockRank: 6, costResource: 'cognitive', baseCost: D(1.4e7), costGrowth: 1.18, produces: 'cognitive', perLevel: D(37_000), prerequisites: [{ skillId: 'nodle', level: 3 }] },
  { id: 'message-queues', kind: 'producer', branch: 'knowledge', unlockRank: 6, costResource: 'cognitive', baseCost: D(3.4e7), costGrowth: 1.18, produces: 'cognitive', perLevel: D(71_000), prerequisites: [{ skillId: 'nodle', level: 3 }] },
  { id: 'kubernoodles', kind: 'producer', branch: 'knowledge', unlockRank: 7, costResource: 'cognitive', baseCost: D(2e8), costGrowth: 1.18, produces: 'cognitive', perLevel: D(2.6e5), prerequisites: [{ skillId: 'dokker', level: 3 }] },
  { id: 'rust-rewrite', kind: 'producer', branch: 'knowledge', unlockRank: 7, costResource: 'cognitive', baseCost: D(4.9e8), costGrowth: 1.18, produces: 'cognitive', perLevel: D(5.1e5), prerequisites: [{ skillId: 'dokker', level: 3 }] },
  { id: 'ml', kind: 'producer', branch: 'knowledge', unlockRank: 8, costResource: 'cognitive', baseCost: D(2e10), costGrowth: 1.2, produces: 'cognitive', perLevel: D(5e6), prerequisites: [{ skillId: 'distributed-systems', level: 5 }] },

  // Work: paid in Capital, produces Capital, gated by knowledge levels.
  { id: 'button-color', kind: 'producer', branch: 'work', unlockRank: 3, costResource: 'capital', baseCost: D(15), costGrowth: 1.15, produces: 'capital', perLevel: D(0.6), prerequisites: [{ skillId: 'js-basics', level: 5 }] },
  { id: 'cafe-landing', kind: 'producer', branch: 'work', unlockRank: 3, costResource: 'capital', baseCost: D(120), costGrowth: 1.15, produces: 'capital', perLevel: D(4), prerequisites: [{ skillId: 'git', level: 3 }] },
  { id: 'freelance', kind: 'producer', branch: 'work', unlockRank: 4, costResource: 'capital', baseCost: D(1_300), costGrowth: 1.16, produces: 'capital', perLevel: D(25), prerequisites: [{ skillId: 'git', level: 10 }] },
  { id: 'pet-project', kind: 'producer', branch: 'work', unlockRank: 4, costResource: 'capital', baseCost: D(14_000), costGrowth: 1.16, produces: 'capital', perLevel: D(160), prerequisites: [{ skillId: 'algorithms', level: 5 }] },
  { id: 'internal-crm', kind: 'producer', branch: 'work', unlockRank: 5, costResource: 'capital', baseCost: D(1.6e5), costGrowth: 1.17, produces: 'capital', perLevel: D(1_100), prerequisites: [{ skillId: 'reakt', level: 5 }] },
  { id: 'bank-microservices', kind: 'producer', branch: 'work', unlockRank: 6, costResource: 'capital', baseCost: D(2e6), costGrowth: 1.17, produces: 'capital', perLevel: D(8_000), prerequisites: [{ skillId: 'nodle', level: 5 }] },
  { id: 'rps-platform', kind: 'producer', branch: 'work', unlockRank: 7, costResource: 'capital', baseCost: D(3e7), costGrowth: 1.18, produces: 'capital', perLevel: D(70_000), prerequisites: [{ skillId: 'dokker', level: 5 }] },
  // Stage 4 fillers: gated by the work rung below them; tech upgrades price from that rung's knowledge.
  { id: 'support-chatbot', kind: 'producer', branch: 'work', unlockRank: 5, costResource: 'capital', baseCost: D(31_000), costGrowth: 1.16, produces: 'capital', perLevel: D(300), prerequisites: [{ skillId: 'pet-project', level: 3 }] },
  { id: 'legacy-php', kind: 'producer', branch: 'work', unlockRank: 5, costResource: 'capital', baseCost: D(72_000), costGrowth: 1.16, produces: 'capital', perLevel: D(580), prerequisites: [{ skillId: 'pet-project', level: 3 }] },
  { id: 'payment-gateway', kind: 'producer', branch: 'work', unlockRank: 6, costResource: 'capital', baseCost: D(3.7e5), costGrowth: 1.17, produces: 'capital', perLevel: D(2_100), prerequisites: [{ skillId: 'internal-crm', level: 3 }] },
  { id: 'fluttr-app', kind: 'producer', branch: 'work', unlockRank: 6, costResource: 'capital', baseCost: D(8.7e5), costGrowth: 1.17, produces: 'capital', perLevel: D(4_200), prerequisites: [{ skillId: 'internal-crm', level: 3 }] },
  { id: 'data-lake', kind: 'producer', branch: 'work', unlockRank: 7, costResource: 'capital', baseCost: D(4.9e6), costGrowth: 1.17, produces: 'capital', perLevel: D(16_000), prerequisites: [{ skillId: 'bank-microservices', level: 3 }] },
  { id: 'marketplace', kind: 'producer', branch: 'work', unlockRank: 7, costResource: 'capital', baseCost: D(1.2e7), costGrowth: 1.17, produces: 'capital', perLevel: D(34_000), prerequisites: [{ skillId: 'bank-microservices', level: 3 }] },
  { id: 'saas', kind: 'producer', branch: 'work', unlockRank: 8, costResource: 'capital', baseCost: D(5e8), costGrowth: 1.18, produces: 'capital', perLevel: D(6e5), prerequisites: [{ skillId: 'distributed-systems', level: 5 }] },
  { id: 'ai-startup', kind: 'producer', branch: 'work', unlockRank: 9, costResource: 'capital', baseCost: D(1e10), costGrowth: 1.19, produces: 'capital', perLevel: D(6e6), prerequisites: [{ skillId: 'ml', level: 5 }] },
  { id: 'own-cloud', kind: 'producer', branch: 'work', unlockRank: 9, costResource: 'capital', baseCost: D(2.5e11), costGrowth: 1.2, produces: 'capital', perLevel: D(7e7), prerequisites: [{ skillId: 'ai-startup', level: 10 }] },

  // Influence: paid in Capital, produces Influence.
  { id: 'code-review', kind: 'producer', branch: 'influence', unlockRank: 5, costResource: 'capital', baseCost: D(30_000), costGrowth: 1.16, produces: 'influence', perLevel: D(0.4) },
  { id: 'tech-blog', kind: 'producer', branch: 'influence', unlockRank: 5, costResource: 'capital', baseCost: D(4e5), costGrowth: 1.17, produces: 'influence', perLevel: D(3), prerequisites: [{ skillId: 'code-review', level: 5 }] },
  { id: 'meetup-talk', kind: 'producer', branch: 'influence', unlockRank: 6, costResource: 'capital', baseCost: D(6e6), costGrowth: 1.17, produces: 'influence', perLevel: D(22), prerequisites: [{ skillId: 'tech-blog', level: 5 }] },
  { id: 'open-source', kind: 'producer', branch: 'influence', unlockRank: 7, costResource: 'capital', baseCost: D(1e8), costGrowth: 1.18, produces: 'influence', perLevel: D(170), prerequisites: [{ skillId: 'meetup-talk', level: 5 }] },
  // Stage 4 fillers.
  { id: 'stack-overflaw', kind: 'producer', branch: 'influence', unlockRank: 5, costResource: 'capital', baseCost: D(1.1e5), costGrowth: 1.16, produces: 'influence', perLevel: D(1.8), prerequisites: [{ skillId: 'code-review', level: 3 }] },
  { id: 'tube-tutorials', kind: 'producer', branch: 'influence', unlockRank: 6, costResource: 'capital', baseCost: D(1.5e6), costGrowth: 1.17, produces: 'influence', perLevel: D(14), prerequisites: [{ skillId: 'tech-blog', level: 3 }] },
  { id: 'tech-book', kind: 'producer', branch: 'influence', unlockRank: 7, costResource: 'capital', baseCost: D(2.4e7), costGrowth: 1.17, produces: 'influence', perLevel: D(100), prerequisites: [{ skillId: 'meetup-talk', level: 3 }] },
  { id: 'conference-tour', kind: 'producer', branch: 'influence', unlockRank: 8, costResource: 'capital', baseCost: D(2e9), costGrowth: 1.19, produces: 'influence', perLevel: D(1_400), prerequisites: [{ skillId: 'open-source', level: 5 }] },
  { id: 'podcast', kind: 'producer', branch: 'influence', unlockRank: 9, costResource: 'capital', baseCost: D(5e10), costGrowth: 1.2, produces: 'influence', perLevel: D(12_000), prerequisites: [{ skillId: 'conference-tour', level: 5 }] },

  // Perks: one rule each, no passive income.
  { id: 'aeropress', kind: 'perk', branch: 'knowledge', unlockRank: 0, costResource: 'cognitive', baseCost: D(40), costGrowth: 1.6, maxLevel: 15, effect: { type: 'tapPower', resources: ['cognitive', 'capital', 'influence'], perLevel: 0.5 } },
  { id: 'sleep', kind: 'perk', branch: 'knowledge', unlockRank: 1, costResource: 'cognitive', baseCost: D(300), costGrowth: 1.8, maxLevel: 10, effect: { type: 'stressReduction', perLevel: 4 } },
  { id: 'mech-keyboard', kind: 'perk', branch: 'work', unlockRank: 3, costResource: 'capital', baseCost: D(200), costGrowth: 1.7, maxLevel: 10, effect: { type: 'tapPower', resources: ['capital'], perLevel: 1 } },
];

// Rates are recomputed many times per frame in the catalog; a map keeps lookups O(1).
const SKILLS_BY_ID = new Map(SKILLS.map((skill) => [skill.id, skill]));
export const skillById = (id: string): SkillDefinition | undefined => SKILLS_BY_ID.get(id);
