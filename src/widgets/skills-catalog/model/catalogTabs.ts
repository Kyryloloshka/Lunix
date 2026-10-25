import { isResourceUnlocked } from '@entities/career-rank';
import {
  BRANCH_RESOURCE,
  SKILLS,
  UPGRADES,
  type SkillBranch,
  type SkillDefinition,
  type Upgrade,
} from '@entities/skill';

/**
 * Stack tab categories (T-016 stage 5): one tab per branch whose resource is unlocked (Knowledge /
 * Work / Influence), then Perks (one-rule skills and leadership perks), then tech Upgrades.
 */
export type CatalogTab = SkillBranch | 'perks' | 'upgrades';

const BRANCH_TABS: SkillBranch[] = ['knowledge', 'work', 'influence'];

export function getCatalogTabs(rank: number): CatalogTab[] {
  return [
    ...BRANCH_TABS.filter((branch) => isResourceUnlocked(BRANCH_RESOURCE[branch], rank)),
    'perks',
    'upgrades',
  ];
}

export interface CatalogEntries {
  skills: SkillDefinition[];
  upgrades: Upgrade[];
}

/**
 * What one tab lists. Branch tabs hold only producers, so every card there shows one "/s" effect;
 * perks of all branches sit together. `isTargetVisible` decides whether a tech upgrade's skill is
 * visible to the player (the store owns that rule).
 */
export function getCatalogEntries(
  tab: CatalogTab,
  rank: number,
  isTargetVisible: (skillId: string) => boolean,
): CatalogEntries {
  const reached = <T extends { unlockRank: number }>(item: T) => item.unlockRank <= rank;
  switch (tab) {
    case 'perks':
      return {
        skills: SKILLS.filter((skill) => skill.kind === 'perk' && reached(skill)),
        upgrades: UPGRADES.filter((upgrade) => upgrade.kind === 'leadership' && reached(upgrade)),
      };
    case 'upgrades':
      return {
        skills: [],
        upgrades: UPGRADES.filter((upgrade) => (
          upgrade.kind === 'tech'
          && reached(upgrade)
          && upgrade.requiredSkill !== undefined
          && isTargetVisible(upgrade.requiredSkill.skillId)
        )),
      };
    default:
      return {
        skills: SKILLS.filter((skill) => skill.kind === 'producer' && skill.branch === tab && reached(skill)),
        upgrades: [],
      };
  }
}
