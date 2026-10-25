import type { SkillDefinition, Upgrade } from '@entities/skill';

/**
 * T-013 ordering. All of it is deterministic and independent of balances: the list must not jump
 * under the player's finger when Capital changes.
 */

/** Higher tier first (`unlockRank`), then the pricier skill first. Stable: ties keep registry order. */
export function sortSkillsStrongestFirst<T extends Pick<SkillDefinition, 'unlockRank' | 'baseCost'>>(skills: readonly T[]): T[] {
  return skills
    .map((skill, index) => ({ skill, index }))
    .sort((a, b) => (
      b.skill.unlockRank - a.skill.unlockRank
      || b.skill.baseCost.compareTo(a.skill.baseCost)
      || a.index - b.index
    ))
    .map(({ skill }) => skill);
}

/** Skills the player can see in the list but has not looked at or bought yet. */
export function getNewSkillIds(skills: readonly Pick<SkillDefinition, 'id'>[], seenSkillIds: readonly string[]): Set<string> {
  const seen = new Set(seenSkillIds);
  return new Set(skills.filter((skill) => !seen.has(skill.id)).map((skill) => skill.id));
}

/** 0 = available and not bought, 1 = not eligible yet (target skill too low), 2 = bought. */
export function upgradeOrderGroup(
  upgrade: Pick<Upgrade, 'id' | 'requiredSkill'>,
  purchasedUpgrades: readonly string[],
  levels: Readonly<Record<string, number>>,
): 0 | 1 | 2 {
  if (purchasedUpgrades.includes(upgrade.id)) return 2;
  const required = upgrade.requiredSkill;
  if (required && (levels[required.skillId] ?? 0) < required.level) return 1;
  return 0;
}

/** Available first, then not-yet-eligible, bought last. Stable inside each group. */
export function sortUpgradesByStatus<T extends Pick<Upgrade, 'id' | 'requiredSkill'>>(
  upgrades: readonly T[],
  purchasedUpgrades: readonly string[],
  levels: Readonly<Record<string, number>>,
): T[] {
  return upgrades
    .map((upgrade, index) => ({ upgrade, index, group: upgradeOrderGroup(upgrade, purchasedUpgrades, levels) }))
    .sort((a, b) => a.group - b.group || a.index - b.index)
    .map(({ upgrade }) => upgrade);
}
