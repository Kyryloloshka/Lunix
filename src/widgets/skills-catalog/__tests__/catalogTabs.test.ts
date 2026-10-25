import { SKILLS, UPGRADES } from '@entities/skill';
import { getCatalogEntries, getCatalogTabs } from '../model/catalogTabs';

const all = () => true;

describe('Stack tab categories (T-016 stage 5)', () => {
  it('shows a branch tab only once its resource is unlocked, then Perks and Upgrades', () => {
    expect(getCatalogTabs(0)).toEqual(['knowledge', 'perks', 'upgrades']);
    expect(getCatalogTabs(3)).toEqual(['knowledge', 'work', 'perks', 'upgrades']);
    expect(getCatalogTabs(5)).toEqual(['knowledge', 'work', 'influence', 'perks', 'upgrades']);
  });

  it('keeps branch tabs to producers of that branch, so each card has one "/s" effect', () => {
    for (const branch of ['knowledge', 'work', 'influence'] as const) {
      const { skills, upgrades } = getCatalogEntries(branch, 10, all);
      expect(skills.length).toBeGreaterThan(0);
      expect(skills.every((skill) => skill.kind === 'producer' && skill.branch === branch)).toBe(true);
      expect(upgrades).toEqual([]);
    }
  });

  it('collects every perk skill and leadership perk in Perks, gated by rank', () => {
    const atStart = getCatalogEntries('perks', 0, all);
    expect(atStart.skills.map((skill) => skill.id)).toEqual(['aeropress']);
    expect(atStart.upgrades).toEqual([]);

    const atTop = getCatalogEntries('perks', 10, all);
    expect(atTop.skills.map((skill) => skill.id).sort())
      .toEqual(SKILLS.filter((skill) => skill.kind === 'perk').map((skill) => skill.id).sort());
    expect(atTop.upgrades.length).toBe(UPGRADES.filter((upgrade) => upgrade.kind === 'leadership').length);
    expect(atTop.upgrades.every((upgrade) => upgrade.kind === 'leadership')).toBe(true);
  });

  it('lists tech upgrades only for skills the player can see', () => {
    expect(getCatalogEntries('upgrades', 0, () => false).upgrades).toEqual([]);
    const visible = getCatalogEntries('upgrades', 0, (id) => id === 'html-tags').upgrades;
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.every((upgrade) => upgrade.kind === 'tech' && upgrade.requiredSkill?.skillId === 'html-tags')).toBe(true);
  });

  it('puts every skill in exactly one tab at the top rank', () => {
    const listed = (['knowledge', 'work', 'influence', 'perks'] as const)
      .flatMap((tab) => getCatalogEntries(tab, 10, all).skills.map((skill) => skill.id));
    expect(listed.sort()).toEqual(SKILLS.map((skill) => skill.id).sort());
  });
});
