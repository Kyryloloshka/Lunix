import { Decimal } from '@shared/lib/decimal';
import { useCurrencyStore } from '@entities/currency';
import { gameEvents, type GameEvent } from '@entities/game-events';
import { UPGRADES } from '@entities/skill';
import { useSkillStore } from '../model/skillStore';

let events: GameEvent[] = [];
let off: () => void;

beforeEach(() => {
  useCurrencyStore.getState().reset();
  useSkillStore.getState().reset();
  events = [];
  off = gameEvents.subscribe((event) => events.push(event));
});
afterEach(() => off());

const fund = (value = 1e12) => useCurrencyStore.getState().addResources({
  capital: Decimal.from(value),
  cognitive: Decimal.from(value),
  influence: Decimal.from(value),
});

const setLevels = (levels: Record<string, number>) => {
  useSkillStore.setState({ levels: { ...useSkillStore.getState().levels, ...levels } });
};

const types = () => events.map((event) => event.type);

describe('skill store events (T-022)', () => {
  it('buying emits one skill_bought with the bought levels; failures emit nothing', () => {
    expect(useSkillStore.getState().buy('html-tags')).toBe(0);
    expect(useSkillStore.getState().buy('no-such-skill')).toBe(0);
    expect(events).toEqual([]);
    fund();
    const bought = useSkillStore.getState().buy('html-tags', 10);
    expect(bought).toBeGreaterThan(0);
    expect(events).toEqual([{ type: 'skill_bought', id: 'html-tags', levels: bought }]);
  });

  it('buying an upgrade emits one upgrade_bought; unaffordable and repeat purchases emit nothing', () => {
    const upgrade = UPGRADES[0];
    useSkillStore.setState({
      currentRank: upgrade.unlockRank,
      levels: upgrade.requiredSkill
        ? { ...useSkillStore.getState().levels, [upgrade.requiredSkill.skillId]: upgrade.requiredSkill.level }
        : useSkillStore.getState().levels,
    });
    expect(useSkillStore.getState().buyUpgrade(upgrade.id)).toBe(false);
    expect(events).toEqual([]);
    fund(1e60);
    expect(useSkillStore.getState().buyUpgrade(upgrade.id)).toBe(true);
    expect(useSkillStore.getState().buyUpgrade(upgrade.id)).toBe(false);
    expect(events).toEqual([{ type: 'upgrade_bought', id: upgrade.id }]);
  });

  it('a failed promotion emits nothing; a successful one emits one rank_up', () => {
    expect(useSkillStore.getState().promote()).toBe(false);
    expect(events).toEqual([]);
    fund(1e6);
    setLevels({ 'html-tags': 5 });
    expect(useSkillStore.getState().promote()).toBe(true);
    expect(events).toEqual([{ type: 'rank_up', from: 0, to: 1 }]);
  });

  it('a promotion that opens a resource emits rank_up and then resource_unlocked', () => {
    useSkillStore.setState({ currentRank: 2 });
    useCurrencyStore.getState().addResources({ cognitive: Decimal.from(1e6) });
    setLevels({ git: 1 });
    expect(useSkillStore.getState().promote()).toBe(true);
    expect(events).toEqual([
      { type: 'rank_up', from: 2, to: 3 },
      { type: 'resource_unlocked', resource: 'capital' },
    ]);
  });

  it('a skill-store tap produces exactly one tap event', () => {
    useSkillStore.getState().tap();
    expect(types()).toEqual(['tap']);
  });

  it('hydrate and reset emit nothing', () => {
    useSkillStore.getState().hydrate({ levels: { git: 5 }, purchasedUpgrades: [], currentRank: 4, seenSkillIds: [] });
    useSkillStore.getState().reset();
    expect(events).toEqual([]);
  });
});
