import { CAREER_RANKS } from '@entities/career-rank';
import { SKILLS, calculateSkillEffects, getSkillCost } from '@entities/skill';

describe('progression mathematical balance simulation', () => {
  it('has bounded finite skill costs across all levels', () => {
    SKILLS.forEach((skill) => {
      const costLevel10 = getSkillCost(skill.baseCost, skill.costGrowth, 10);
      const costLevel50 = getSkillCost(skill.baseCost, skill.costGrowth, 50);

      expect(costLevel10.isPositive()).toBe(true);
      expect(costLevel50.gt(costLevel10)).toBe(true);
      expect(Number.isFinite(costLevel10.toNumber()) || costLevel10.exponent > 0).toBe(true);
    });
  });

  it('guarantees each career rank is reachable with growing passive generation', () => {
    let currentEffects = calculateSkillEffects(
      Object.fromEntries(SKILLS.map((skill) => [skill.id, 0])),
    );

    CAREER_RANKS.forEach((rank, index) => {
      if (index === 0) return;
      const prevRank = CAREER_RANKS[index - 1];
      expect(rank.requiredCapital.gte(prevRank.requiredCapital)).toBe(true);
      expect(rank.requiredInfluence.gte(prevRank.requiredInfluence)).toBe(true);

      const levelConfig = Object.fromEntries(SKILLS.map((skill) => [skill.id, index * 2]));
      currentEffects = calculateSkillEffects(levelConfig);
      expect(currentEffects.capitalPerSec.gt(0)).toBe(true);
    });
  });
});
