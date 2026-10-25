import { Decimal } from '@shared/lib/decimal';
import { getBulkSkillCost } from '@entities/skill';
import { SAVE_VERSION, parseGame, serializeGame } from '../saveSnapshot';

describe('save snapshot', () => {
  const currency = {
    capital: new Decimal(1.5, 400),
    cognitive: Decimal.from(12),
    influence: Decimal.from(3),
    totalCapitalEarned: new Decimal(2, 400),
    totalCognitiveEarned: new Decimal(7, 350),
    stress: 42,
  };
  const skills = { levels: { 'html-tags': 5 }, purchasedUpgrades: ['delegation'], currentRank: 2, seenSkillIds: ['html-tags'] };

  const onboarding = { introDone: true, tapDone: true, buyDone: false, stressDone: false };

  it('writes the current version and round-trips huge values', () => {
    const raw = serializeGame(currency, skills, onboarding, 1234);
    expect(JSON.parse(raw).version).toBe(SAVE_VERSION);
    const save = parseGame(raw);
    expect(save?.savedAt).toBe(1234);
    expect(save?.currency.capital.eq(currency.capital)).toBe(true);
    expect(save?.currency.totalCognitiveEarned.eq(currency.totalCognitiveEarned)).toBe(true);
    expect(save?.currency.stress).toBe(42);
    expect(save?.skills).toEqual(skills);
    expect(save?.onboarding).toEqual(onboarding);
  });

  it('returns null for missing, corrupt or unknown saves', () => {
    expect(parseGame(null)).toBeNull();
    expect(parseGame('{not json')).toBeNull();
    expect(parseGame(JSON.stringify({ version: 99, currency: {} }))).toBeNull();
    expect(parseGame(JSON.stringify({ version: 3 }))).toBeNull();
  });

  it('drops negative and malformed currency values', () => {
    const save = parseGame(JSON.stringify({
      version: 2,
      savedAt: 'yesterday',
      currency: { capital: { m: -5, e: 3 }, cognitive: 'lots', stress: 'high' },
    }));
    expect(save?.savedAt).toBe(0);
    expect(save?.currency.capital.isZero()).toBe(true);
    expect(save?.currency.cognitive.isZero()).toBe(true);
    expect(save?.currency.totalCognitiveEarned.isZero()).toBe(true);
    expect(save?.currency.stress).toBe(0);
    expect(save?.skills.levels).toEqual({});
  });
});

describe('save migration v1 → v2 (career phases)', () => {
  const v1 = (overrides: Record<string, unknown> = {}) => JSON.stringify({
    version: 1,
    savedAt: 1000,
    currency: {
      capital: { m: 5, e: 2 },
      cognitive: { m: 4, e: 1 },
      influence: { m: 7, e: 0 },
      totalCapitalEarned: { m: 1, e: 6 },
      stress: 30,
    },
    skills: { levels: { 'html-css': 5, coffee: 2 }, purchasedUpgrades: ['tailwind-macro'], currentRank: 4 },
    ...overrides,
  });

  it('keeps balances, maps the rank and drops removed skill ids', () => {
    const save = parseGame(v1());
    expect(save).not.toBeNull();
    expect(save!.savedAt).toBe(1000);
    // Old Senior (4) is Senior (6) after two student ranks were added.
    expect(save!.skills.currentRank).toBe(6);
    expect(save!.skills.levels).toEqual({});
    expect(save!.skills.purchasedUpgrades).toEqual([]);
    expect(save!.currency.influence.toNumber()).toBe(7);
    expect(save!.currency.totalCapitalEarned.toNumber()).toBe(1e6);
    expect(save!.currency.totalCognitiveEarned.toNumber()).toBe(40);
    expect(save!.currency.stress).toBe(30);
  });

  it('refunds every Capital spent on v1 skills and upgrades', () => {
    const save = parseGame(v1())!;
    const refund = getBulkSkillCost(Decimal.from(15), 1.15, 0, 5)
      .add(getBulkSkillCost(Decimal.from(25), 1.15, 0, 2))
      .add(Decimal.from(250));
    expect(save.currency.capital.toNumber()).toBeCloseTo(500 + refund.toNumber(), 6);
    expect(save.currency.capital.gte(Decimal.from(500))).toBe(true);
  });

  it('maps every v1 rank and clamps junk', () => {
    const rankOf = (currentRank: unknown) => parseGame(v1({ skills: { currentRank } }))!.skills.currentRank;
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8].map(rankOf)).toEqual([0, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(rankOf(-1)).toBe(0);
    expect(rankOf(99)).toBe(10);
    expect(rankOf('boss')).toBe(0);
  });

  it('ignores unknown, negative and absurd v1 levels when refunding', () => {
    const save = parseGame(v1({
      skills: { levels: { 'html-css': -4, mystery: 50, docker: Number.MAX_VALUE }, purchasedUpgrades: ['fake', 42], currentRank: 0 },
    }))!;
    expect(save.currency.capital.isPositive()).toBe(true);
    expect(Number.isFinite(save.currency.capital.exponent)).toBe(true);
    // A tampered level is capped, so the refund is bounded instead of Infinity.
    const capped = getBulkSkillCost(Decimal.from(25_000), 1.19, 0, 10_000);
    expect(save.currency.capital.lte(capped.add(Decimal.from(500)))).toBe(true);
  });
});

describe('save migration v2 → v3 (onboarding, T-018)', () => {
  const v2 = JSON.stringify({
    version: 2,
    savedAt: 1000,
    currency: { capital: { m: 5, e: 2 }, cognitive: { m: 1, e: 1 }, stress: 3 },
    skills: { levels: { 'html-tags': 2 }, purchasedUpgrades: [], currentRank: 1 },
  });

  it('treats existing players as having finished onboarding', () => {
    const save = parseGame(v2)!;
    expect(save.onboarding).toEqual({ introDone: true, tapDone: true, buyDone: true, stressDone: true });
    expect(save.skills.currentRank).toBe(1);
    expect(save.currency.capital.eq(Decimal.from(500))).toBe(true);
  });

  it('migrates v1 saves to a finished onboarding too', () => {
    const save = parseGame(JSON.stringify({ version: 1, savedAt: 1, currency: { capital: { m: 1, e: 0 } }, skills: {} }))!;
    expect(save.onboarding.introDone).toBe(true);
  });

  it('reads v3 flags strictly: anything but true counts as not done', () => {
    const save = parseGame(JSON.stringify({
      version: 3,
      currency: {},
      onboarding: { introDone: true, tapDone: 'yes', buyDone: 1 },
    }))!;
    expect(save.onboarding).toEqual({ introDone: true, tapDone: false, buyDone: false, stressDone: false });
  });

  it('a v3 save without the onboarding block starts the guide instead of crashing', () => {
    const save = parseGame(JSON.stringify({ version: 3, currency: {} }))!;
    expect(save.onboarding.introDone).toBe(false);
  });
});
