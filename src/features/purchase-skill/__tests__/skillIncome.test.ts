import { Decimal } from '@shared/lib/decimal';
import { SKILLS, TECH_UPGRADES, skillById, upgradeById } from '@entities/skill';
import { useCurrencyStore } from '@entities/currency';
import {
  calculateRates,
  decimalShare,
  getSkillContribution,
  previewSkillGain,
  previewUpgrade,
} from '../model/skillIncome';
import { useSkillStore } from '../model/skillStore';

const base = (levels: Record<string, number> = {}, purchasedUpgrades: string[] = []) => ({
  levels: { ...Object.fromEntries(SKILLS.map((skill) => [skill.id, 0])), ...levels },
  purchasedUpgrades,
});

describe('previewSkillGain', () => {
  it('equals the change of the real rates for every skill, with and without upgrades', () => {
    const upgrades = TECH_UPGRADES.map((upgrade) => upgrade.id);
    for (const owned of [[], upgrades]) {
      for (const skill of SKILLS) {
        const state = base({ [skill.id]: 7 }, owned);
        const before = calculateRates(state.levels, state.purchasedUpgrades);
        const after = calculateRates({ ...state.levels, [skill.id]: 8 }, state.purchasedUpgrades);
        const gain = previewSkillGain(state, skill.id, 1);
        if (skill.kind === 'producer') {
          const key = `${skill.produces}PerSec` as 'capitalPerSec' | 'cognitivePerSec' | 'influencePerSec';
          expect(gain.perSec[skill.produces].toNumber()).toBeCloseTo(after[key].subtract(before[key]).toNumber(), 6);
          expect(gain.perSec[skill.produces].isPositive()).toBe(true);
        } else {
          const anyGain = Object.values(gain.perTap).some((value) => value.isPositive()) || gain.stressPerTapReduction > 0;
          expect(anyGain).toBe(true);
        }
      }
    }
  });

  it('matches what the store really does after a purchase', () => {
    useCurrencyStore.getState().reset();
    useSkillStore.getState().reset();
    useCurrencyStore.getState().addResources({ cognitive: Decimal.from(1e6) });
    const { levels, purchasedUpgrades } = useSkillStore.getState();
    const gain = previewSkillGain({ levels, purchasedUpgrades }, 'html-tags', 3);
    const rateBefore = useCurrencyStore.getState().rates.cognitivePerSec;
    expect(useSkillStore.getState().buy('html-tags', 10)).toBeGreaterThan(0);
    // buy(…, 10) bought 10 levels, so compare through the same function for 10.
    const rateAfter = useCurrencyStore.getState().rates.cognitivePerSec;
    const gain10 = previewSkillGain({ levels, purchasedUpgrades }, 'html-tags', 10);
    expect(rateAfter.subtract(rateBefore).toNumber()).toBeCloseTo(gain10.perSec.cognitive.toNumber(), 8);
    expect(gain.perSec.cognitive.toNumber()).toBeCloseTo(1.5);
  });

  it('includes upgrade multipliers that the plain per-level number misses', () => {
    const skill = skillById('html-tags');
    if (skill?.kind !== 'producer') throw new Error('html-tags must be a producer');
    const upgrade = TECH_UPGRADES.find((item) => item.effect.type === 'skillMultiplier' && item.effect.skillId === 'html-tags');
    if (!upgrade || upgrade.effect.type !== 'skillMultiplier') throw new Error('missing upgrade');
    const plain = previewSkillGain(base({ 'html-tags': 1 }), 'html-tags', 1).perSec.cognitive;
    const boosted = previewSkillGain(base({ 'html-tags': 1 }, [upgrade.id]), 'html-tags', 1).perSec.cognitive;
    expect(boosted.toNumber()).toBeCloseTo(plain.toNumber() * upgrade.effect.multiplier, 8);
  });

  it('shows the doubling at milestone thresholds (24 -> 25 levels)', () => {
    const state = base({ 'html-tags': 24 });
    const gain = previewSkillGain(state, 'html-tags', 1).perSec.cognitive.toNumber();
    // 25 levels at x2 = 25 * 0.5 * 2 = 25 versus 24 * 0.5 = 12.
    expect(gain).toBeCloseTo(25 - 12, 8);
    expect(gain).toBeGreaterThan(0.5);
  });

  it('is zero at 0 levels, for unknown skills and for maxed perks', () => {
    const state = base({ aeropress: 15 });
    expect(previewSkillGain(state, 'html-tags', 0).perSec.cognitive.isZero()).toBe(true);
    expect(previewSkillGain(state, 'nope', 5).perSec.cognitive.isZero()).toBe(true);
    const maxed = previewSkillGain(state, 'aeropress', 3);
    expect(maxed.perTap.cognitive.isZero()).toBe(true);
  });

  it('describes perk effects: tap power and stress', () => {
    const tap = previewSkillGain(base(), 'aeropress', 2);
    expect(tap.perTap.cognitive.isPositive()).toBe(true);
    expect(tap.perTap.capital.isPositive()).toBe(true);
    const workTap = previewSkillGain(base(), 'mech-keyboard', 1);
    expect(workTap.perTap.capital.isPositive()).toBe(true);
    expect(workTap.perTap.cognitive.isZero()).toBe(true);
    const stress = previewSkillGain(base(), 'sleep', 1);
    expect(stress.stressPerTapReduction).toBeCloseTo(1 - 1 / 1.04, 6);
  });

  it('stays finite for huge levels (many milestones)', () => {
    const gain = previewSkillGain(base({ 'html-tags': 5000 }), 'html-tags', 1000).perSec.cognitive;
    expect(Number.isFinite(gain.mantissa)).toBe(true);
    expect(gain.isPositive()).toBe(true);
  });
});

describe('getSkillContribution', () => {
  it('is zero for an unbought skill and has no NaN share', () => {
    const contribution = getSkillContribution(base(), 'html-tags');
    expect(contribution.perSec.cognitive.isZero()).toBe(true);
    expect(contribution.share).toBe(0);
  });

  it('splits income between skills and shares sum to 1', () => {
    const state = base({ 'html-tags': 10, 'css-centering': 10 });
    const a = getSkillContribution(state, 'html-tags');
    const b = getSkillContribution(state, 'css-centering');
    expect(a.perSec.cognitive.toNumber()).toBeCloseTo(5);
    expect(b.perSec.cognitive.toNumber()).toBeCloseTo(25);
    expect((a.share ?? 0) + (b.share ?? 0)).toBeCloseTo(1, 8);
    expect(b.share).toBeCloseTo(25 / 30, 8);
  });

  it('includes the upgrade multiplier in what a skill gives now', () => {
    const upgrade = TECH_UPGRADES.find((item) => item.effect.type === 'skillMultiplier' && item.effect.skillId === 'html-tags');
    if (!upgrade || upgrade.effect.type !== 'skillMultiplier') throw new Error('missing upgrade');
    const plain = getSkillContribution(base({ 'html-tags': 10 }), 'html-tags').perSec.cognitive.toNumber();
    const boosted = getSkillContribution(base({ 'html-tags': 10 }, [upgrade.id]), 'html-tags').perSec.cognitive.toNumber();
    expect(boosted).toBeCloseTo(plain * upgrade.effect.multiplier, 8);
  });

  it('gives perks no share but reports their effect', () => {
    const contribution = getSkillContribution(base({ aeropress: 4 }), 'aeropress');
    expect(contribution.share).toBeNull();
    expect(contribution.resource).toBeNull();
    expect(contribution.perTap.cognitive.isPositive()).toBe(true);
  });
});

describe('decimalShare', () => {
  it('handles zero totals and parts', () => {
    expect(decimalShare(Decimal.from(5), Decimal.ZERO)).toBe(0);
    expect(decimalShare(Decimal.ZERO, Decimal.from(5))).toBe(0);
  });

  it('works beyond 1e308 without NaN or Infinity', () => {
    const total = Decimal.fromLog10(500);
    const part = Decimal.fromLog10(499.5);
    const share = decimalShare(part, total);
    expect(Number.isFinite(share)).toBe(true);
    expect(share).toBeCloseTo(10 ** -0.5, 6);
    expect(decimalShare(total, total)).toBe(1);
    expect(decimalShare(Decimal.fromLog10(100), total)).toBe(0);
  });
});

describe('previewUpgrade', () => {
  it('shows the boosted skill output before and after', () => {
    const upgrade = TECH_UPGRADES.find((item) => item.effect.type === 'skillMultiplier' && item.effect.skillId === 'html-tags');
    if (!upgrade || upgrade.effect.type !== 'skillMultiplier') throw new Error('missing upgrade');
    const preview = previewUpgrade(base({ 'html-tags': 10 }), upgrade.id);
    expect(preview?.resource).toBe('cognitive');
    expect(preview?.before.toNumber()).toBeCloseTo(5);
    expect(preview?.after.toNumber()).toBeCloseTo(5 * upgrade.effect.multiplier);
  });

  it('stacks on top of upgrades already owned and ignores the one being previewed twice', () => {
    const tier = TECH_UPGRADES.filter((item) => item.effect.type === 'skillMultiplier' && item.effect.skillId === 'html-tags');
    const [first, second] = tier;
    if (!first || !second || first.effect.type !== 'skillMultiplier' || second.effect.type !== 'skillMultiplier') {
      throw new Error('need two html-tags upgrades');
    }
    const preview = previewUpgrade(base({ 'html-tags': 10 }, [first.id]), second.id);
    expect(preview?.before.toNumber()).toBeCloseTo(5 * first.effect.multiplier);
    expect(preview?.after.toNumber()).toBeCloseTo(5 * first.effect.multiplier * second.effect.multiplier);
    const owned = previewUpgrade(base({ 'html-tags': 10 }, [first.id]), first.id);
    expect(owned?.before.toNumber()).toBeCloseTo(5);
  });

  it('covers a branch boost across the branch skills', () => {
    const delegation = upgradeById('delegation');
    if (!delegation || delegation.effect.type !== 'branchMultiplier') throw new Error('missing delegation');
    const preview = previewUpgrade(base({ 'button-color': 10, 'html-tags': 10 }), 'delegation');
    expect(preview?.resource).toBe('capital');
    expect(preview?.before.toNumber()).toBeCloseTo(6);
    expect(preview?.after.toNumber()).toBeCloseTo(6 * delegation.effect.multiplier);
    expect(preview?.skillId).toBeNull();
  });

  it('is null for unknown upgrades', () => {
    expect(previewUpgrade(base(), 'nope')).toBeNull();
  });
});
