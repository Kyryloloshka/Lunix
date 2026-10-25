import { Decimal } from '@shared/lib/decimal';
import { SKILLS, UPGRADES } from '@entities/skill';
import { calculateRates, getSkillContribution, previewSkillGain, previewUpgrade } from '@features/purchase-skill';

// A late-game state: every skill levelled, half of the upgrades bought.
const levels: Record<string, number> = Object.fromEntries(SKILLS.map((skill, i) => [skill.id, 30 + i * 7]));
const purchasedUpgrades = UPGRADES.filter((_, i) => i % 2 === 0).map((upgrade) => upgrade.id);
const state = { levels, purchasedUpgrades };

const PER_SEC = { capital: 'capitalPerSec', cognitive: 'cognitivePerSec', influence: 'influencePerSec' } as const;
// Equal up to float noise relative to the total rate (subtracting two big totals loses digits).
const close = (a: Decimal, b: Decimal, total: Decimal) => {
  if (total.isZero()) return a.isZero() && b.isZero();
  return Math.abs(a.subtract(b).divide(total).toNumber()) < 1e-9;
};

describe('catalog previews (fast paths)', () => {
  it('a producer gain equals the full rate recalculation', () => {
    for (const skill of SKILLS) {
      if (skill.kind !== 'producer') continue;
      const before = calculateRates(levels, purchasedUpgrades)[PER_SEC[skill.produces]];
      const after = calculateRates({ ...levels, [skill.id]: levels[skill.id] + 10 }, purchasedUpgrades)[PER_SEC[skill.produces]];
      expect(close(previewSkillGain(state, skill.id, 10).perSec[skill.produces], after.subtract(before), after)).toBe(true);
    }
  });

  it('a producer contribution equals rates with it minus rates without it', () => {
    for (const skill of SKILLS) {
      if (skill.kind !== 'producer') continue;
      const now = calculateRates(levels, purchasedUpgrades)[PER_SEC[skill.produces]];
      const without = calculateRates({ ...levels, [skill.id]: 0 }, purchasedUpgrades)[PER_SEC[skill.produces]];
      expect(close(getSkillContribution(state, skill.id).perSec[skill.produces], now.subtract(without), now)).toBe(true);
    }
  });

  it('an upgrade preview after/before ratio matches the full recalculation', () => {
    for (const upgrade of UPGRADES) {
      const preview = previewUpgrade(state, upgrade.id);
      if (!preview || preview.before.isZero()) continue;
      const without = purchasedUpgrades.filter((id) => id !== upgrade.id);
      const totalBefore = calculateRates(levels, without)[PER_SEC[preview.resource]];
      const totalAfter = calculateRates(levels, [...without, upgrade.id])[PER_SEC[preview.resource]];
      // The boosted part grows by exactly as much as the whole resource does.
      expect(close(preview.after.subtract(preview.before), totalAfter.subtract(totalBefore), totalAfter)).toBe(true);
    }
  });

  it('previews every upgrade fast enough to run on each purchase', () => {
    // Regression: previews recomputed all rates per producer (~255 ms on a desktop, seconds on a phone).
    previewUpgrade(state, UPGRADES[0].id); // warm up
    const started = Date.now();
    for (const upgrade of UPGRADES) previewUpgrade(state, upgrade.id);
    expect(Date.now() - started).toBeLessThan(80);
  });
});
