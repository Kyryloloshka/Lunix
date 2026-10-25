import { SKILLS, UPGRADES } from '@entities/skill';
import { Decimal } from '@shared/lib/decimal';
import { getCatalogEntries, getLockedTeaser } from '../model/catalogTabs';
import { getNewSkillIds, sortSkillsStrongestFirst, sortUpgradesByStatus } from '../model/catalogOrder';

const all = () => true;
const skill = (id: string, unlockRank: number, cost: number) => ({ id, unlockRank, baseCost: Decimal.from(cost) });

describe('skill ordering (T-013)', () => {
  it('puts the higher tier first, then the pricier skill, stable on ties', () => {
    const sorted = sortSkillsStrongestFirst([skill('a', 0, 10), skill('b', 2, 5), skill('c', 2, 50), skill('d', 2, 50), skill('e', 1, 1)]);
    expect(sorted.map((s) => s.id)).toEqual(['c', 'd', 'b', 'e', 'a']);
  });

  it('sorts every catalog tab strongest first, independent of balances', () => {
    for (const tab of ['knowledge', 'work', 'influence', 'perks'] as const) {
      const { skills } = getCatalogEntries(tab, 10, all);
      for (let i = 1; i < skills.length; i += 1) {
        const [prev, next] = [skills[i - 1], skills[i]];
        const ok = prev.unlockRank > next.unlockRank
          || (prev.unlockRank === next.unlockRank && prev.baseCost.gte(next.baseCost));
        expect(ok).toBe(true);
      }
    }
  });

  it('puts a skill opened by the latest rank first in its tab', () => {
    const { skills } = getCatalogEntries('knowledge', 10, all);
    expect(skills[0].unlockRank).toBe(Math.max(...skills.map((s) => s.unlockRank)));
  });
});

describe('NEW skills', () => {
  it('flags only skills that are not in the seen list', () => {
    const list = [{ id: 'a' }, { id: 'b' }];
    expect([...getNewSkillIds(list, ['a'])]).toEqual(['b']);
    expect(getNewSkillIds(list, ['a', 'b']).size).toBe(0);
  });
});

describe('locked teaser', () => {
  it('shows the next rank that opens something, never a name', () => {
    const teaser = getLockedTeaser('knowledge', 0);
    const expected = Math.min(...SKILLS.filter((s) => s.kind === 'producer' && s.branch === 'knowledge' && s.unlockRank > 0).map((s) => s.unlockRank));
    expect(teaser?.unlockRank).toBe(expected);
    expect(Object.keys(teaser!).sort()).toEqual(['count', 'unlockRank']);
  });

  it('is null at the top rank and on the upgrades tab', () => {
    expect(getLockedTeaser('upgrades', 0)).toBeNull();
    expect(getLockedTeaser('knowledge', 10)).toBeNull();
  });
});

describe('upgrade ordering', () => {
  const tech = UPGRADES.filter((u) => u.requiredSkill).slice(0, 4);

  it('puts available first, not-yet-eligible next, bought last', () => {
    const levels = { [tech[0].requiredSkill!.skillId]: 999 } as Record<string, number>;
    const available = (u: (typeof tech)[number]) => (levels[u.requiredSkill!.skillId] ?? 0) >= u.requiredSkill!.level;
    const bought = tech.find(available)!;
    const sorted = sortUpgradesByStatus(tech, [bought.id], levels);
    expect(sorted[sorted.length - 1].id).toBe(bought.id);
    const groups = sorted.map((u) => (u.id === bought.id ? 2 : available(u) ? 0 : 1));
    expect(groups).toEqual([...groups].sort((a, b) => a - b));
  });

  it('keeps registry order inside a group', () => {
    const sorted = sortUpgradesByStatus([tech[2], tech[1], tech[0]], [], {});
    expect(sorted.map((u) => u.id)).toEqual([tech[2].id, tech[1].id, tech[0].id]);
  });
});
