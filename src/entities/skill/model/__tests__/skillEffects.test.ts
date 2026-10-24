import { Decimal } from '@shared/lib/decimal';
import { calculateSkillEffects, getMilestoneMultiplier } from '../skillEffects';
import { LEADERSHIP_PERKS, TECH_UPGRADES } from '../upgradesRegistry';

describe('skill effects', () => {
  it('makes each producer add only its own resource', () => {
    const effects = calculateSkillEffects({ 'html-tags': 2, 'button-color': 1, 'code-review': 1 });
    expect(effects.cognitivePerSec.toNumber()).toBeCloseTo(1);
    expect(effects.capitalPerSec.toNumber()).toBeCloseTo(0.6);
    expect(effects.influencePerSec.toNumber()).toBeCloseTo(0.4);
  });

  it('starts from zero income and neutral perks', () => {
    const effects = calculateSkillEffects({});
    expect(effects.cognitivePerSec.isZero()).toBe(true);
    expect(effects.tapMultiplier).toEqual({ capital: 1, cognitive: 1, influence: 1 });
    expect(effects.stressReduction).toBe(0);
  });

  it('doubles output at each milestone level', () => {
    expect(getMilestoneMultiplier(24)).toBe(1);
    expect(getMilestoneMultiplier(25)).toBe(2);
    expect(getMilestoneMultiplier(200)).toBe(16);
    const at25 = calculateSkillEffects({ 'html-tags': 25 }).cognitivePerSec;
    expect(at25.eq(Decimal.from(0.5 * 25 * 2))).toBe(true);
  });

  it('applies perks as one rule each, not as income', () => {
    const effects = calculateSkillEffects({ aeropress: 2, 'mech-keyboard': 1, sleep: 3 });
    expect(effects.tapMultiplier.cognitive).toBeCloseTo(2);
    expect(effects.tapMultiplier.capital).toBeCloseTo(3);
    expect(effects.stressReduction).toBe(12);
    expect(effects.cognitivePerSec.isZero()).toBe(true);
  });

  it('multiplies one skill with a tech upgrade and a whole branch with a leadership perk', () => {
    const tier1 = TECH_UPGRADES.find((upgrade) => upgrade.id === 'html-tags-opt-1')!;
    const delegation = LEADERSHIP_PERKS.find((upgrade) => upgrade.id === 'delegation')!;
    const effects = calculateSkillEffects(
      { 'html-tags': 10, 'button-color': 10, 'cafe-landing': 10 },
      [tier1.id, delegation.id, 'unknown-upgrade'],
    );
    expect(effects.cognitivePerSec.toNumber()).toBeCloseTo(0.5 * 10 * 2);
    expect(effects.capitalPerSec.toNumber()).toBeCloseTo((0.6 + 4) * 10 * 2);
  });

  it('prices tech upgrades in Cognitive and influence upgrades in Influence', () => {
    expect(TECH_UPGRADES.find((upgrade) => upgrade.id === 'button-color-opt-1')?.costResource).toBe('cognitive');
    expect(TECH_UPGRADES.find((upgrade) => upgrade.id === 'code-review-opt-1')?.costResource).toBe('influence');
    // Work upgrades are priced from the knowledge skill behind them: js-basics (600) × 25.
    expect(TECH_UPGRADES.find((upgrade) => upgrade.id === 'button-color-opt-1')?.cost.toNumber()).toBe(15_000);
  });

  it('stays finite for levels far beyond the Number range of costs', () => {
    const effects = calculateSkillEffects({ ml: 1e9 });
    expect(effects.cognitivePerSec.isPositive()).toBe(true);
    expect(Number.isFinite(effects.cognitivePerSec.exponent)).toBe(true);
  });
});
