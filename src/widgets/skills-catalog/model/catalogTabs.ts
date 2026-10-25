import { isResourceUnlocked } from '@entities/career-rank';
import {
  BRANCH_RESOURCE,
  SKILLS,
  UPGRADES,
  type SkillBranch,
  type SkillDefinition,
  type Upgrade,
} from '@entities/skill';
import { sortSkillsStrongestFirst } from './catalogOrder';

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

export interface LockedTeaser {
  /** Rank that opens the next closed skill of this tab. The skill's name is deliberately not exposed. */
  unlockRank: number;
  /** How many skills open at that rank in this tab. */
  count: number;
}

/**
 * Curiosity hook (T-013): the next closed skill of a tab, as "??? opens at rank N". Only the
 * condition leaves the model, never the name. Null when the tab has nothing left to open
 * (upgrades tab, or everything is already reached).
 */
export function getLockedTeaser(tab: CatalogTab, rank: number): LockedTeaser | null {
  if (tab === 'upgrades') return null;
  const closed = SKILLS.filter((skill) => (
    skill.unlockRank > rank
    && (tab === 'perks' ? skill.kind === 'perk' : skill.kind === 'producer' && skill.branch === tab)
  ));
  if (closed.length === 0) return null;
  const unlockRank = Math.min(...closed.map((skill) => skill.unlockRank));
  return { unlockRank, count: closed.filter((skill) => skill.unlockRank === unlockRank).length };
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
        skills: sortSkillsStrongestFirst(SKILLS.filter((skill) => skill.kind === 'perk' && reached(skill))),
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
        skills: sortSkillsStrongestFirst(
          SKILLS.filter((skill) => skill.kind === 'producer' && skill.branch === tab && reached(skill)),
        ),
        upgrades: [],
      };
  }
}
