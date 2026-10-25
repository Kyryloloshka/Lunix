import { getReachedSkillIds } from '@features/purchase-skill';
import { parseGame } from '../saveSnapshot';

describe('save migration v3 → v4 (seen skills, T-013)', () => {
  const body = (version: number, skills: Record<string, unknown>) => JSON.stringify({
    version,
    savedAt: 1,
    currency: { capital: { m: 1, e: 1 } },
    skills,
  });

  it('loads a v2 and a v3 save, marking skills of the reached ranks as seen', () => {
    for (const version of [2, 3]) {
      const save = parseGame(body(version, { levels: {}, purchasedUpgrades: [], currentRank: 3 }))!;
      expect(save.skills.seenSkillIds).toEqual(getReachedSkillIds(3));
      expect(save.skills.seenSkillIds.length).toBeGreaterThan(0);
    }
  });

  it('does not mark skills of ranks the player has not reached', () => {
    const save = parseGame(body(3, { currentRank: 0 }))!;
    expect(save.skills.seenSkillIds).toEqual(getReachedSkillIds(0));
    expect(save.skills.seenSkillIds.length).toBeLessThan(getReachedSkillIds(10).length);
  });

  it('keeps the stored seen list in v4 and falls back safely when it is corrupt', () => {
    expect(parseGame(body(4, { currentRank: 3, seenSkillIds: ['git'] }))!.skills.seenSkillIds).toEqual(['git']);
    expect(parseGame(body(4, { currentRank: 3, seenSkillIds: [1, 'git', null] }))!.skills.seenSkillIds).toEqual(['git']);
    expect(parseGame(body(4, { currentRank: 3, seenSkillIds: 'all' }))!.skills.seenSkillIds).toEqual(getReachedSkillIds(3));
  });

  it('migrates v1 saves too', () => {
    const save = parseGame(JSON.stringify({ version: 1, savedAt: 1, currency: { capital: { m: 1, e: 0 } }, skills: { currentRank: 0 } }))!;
    expect(save.skills.seenSkillIds).toEqual(getReachedSkillIds(0));
  });
});
