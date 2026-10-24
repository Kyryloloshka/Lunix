import { Decimal } from '@shared/lib/decimal';
import { parseGame, serializeGame } from '../saveSnapshot';

describe('save snapshot', () => {
  const currency = {
    capital: new Decimal(1.5, 400),
    cognitive: Decimal.from(12),
    influence: Decimal.from(3),
    totalCapitalEarned: new Decimal(2, 400),
    stress: 42,
  };
  const skills = { levels: { 'html-css': 5 }, purchasedUpgrades: ['tailwind-macro'], currentRank: 2 };

  it('round-trips huge values', () => {
    const save = parseGame(serializeGame(currency, skills, 1234));
    expect(save?.savedAt).toBe(1234);
    expect(save?.currency.capital.eq(currency.capital)).toBe(true);
    expect(save?.currency.stress).toBe(42);
    expect(save?.skills).toEqual(skills);
  });

  it('returns null for missing, corrupt or unknown saves', () => {
    expect(parseGame(null)).toBeNull();
    expect(parseGame('{not json')).toBeNull();
    expect(parseGame(JSON.stringify({ version: 99, currency: {} }))).toBeNull();
  });

  it('drops negative and malformed currency values', () => {
    const save = parseGame(JSON.stringify({
      version: 1,
      savedAt: 'yesterday',
      currency: { capital: { m: -5, e: 3 }, cognitive: 'lots', stress: 'high' },
    }));
    expect(save?.savedAt).toBe(0);
    expect(save?.currency.capital.isZero()).toBe(true);
    expect(save?.currency.cognitive.isZero()).toBe(true);
    expect(save?.currency.stress).toBe(0);
    expect(save?.skills.levels).toEqual({});
  });
});
