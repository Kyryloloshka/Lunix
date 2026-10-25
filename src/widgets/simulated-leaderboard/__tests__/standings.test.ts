import { Decimal } from '@shared/lib/decimal';
import { NPC_LEADERS } from '../model/npcLeaders';
import {
  NPC_GROWTH_MAX,
  NPC_GROWTH_MIN,
  PLAYER_ID,
  buildStandings,
  npcCapitalAt,
  npcGrowthExponent,
  selectRival,
} from '../model/standings';

const lowestNpc = () =>
  [...NPC_LEADERS].sort((a, b) => a.capital.compareTo(b.capital))[0];

describe('NPC growth', () => {
  it('derives a stable growth exponent from the id, inside the bounds', () => {
    for (const npc of NPC_LEADERS) {
      const alpha = npcGrowthExponent(npc.id);
      expect(alpha).toBe(npcGrowthExponent(npc.id));
      expect(alpha).toBeGreaterThanOrEqual(NPC_GROWTH_MIN);
      expect(alpha).toBeLessThanOrEqual(NPC_GROWTH_MAX);
    }
  });

  it('is deterministic: the same save gives the same numbers', () => {
    const save = Decimal.from(123_456.78);
    const first = buildStandings(NPC_LEADERS, save);
    const second = buildStandings(NPC_LEADERS, Decimal.fromJSON(JSON.parse(JSON.stringify(save))));
    expect(second.map((s) => [s.id, s.capital.toJSON(), s.place])).toEqual(
      first.map((s) => [s.id, s.capital.toJSON(), s.place]),
    );
  });

  it('keeps base capital at zero player progress and grows monotonically', () => {
    const npc = NPC_LEADERS[0];
    const alpha = npcGrowthExponent(npc.id);
    expect(npcCapitalAt(npc.capital, alpha, Decimal.ZERO).eq(npc.capital)).toBe(true);
    let previous = npc.capital;
    for (const p of [1, 1e3, 1e9, 1e20]) {
      const next = npcCapitalAt(npc.capital, alpha, Decimal.from(p));
      expect(next.gte(previous)).toBe(true);
      previous = next;
    }
  });

  it('never lets the NPC above the player run away: the ratio rival/player shrinks as the player earns', () => {
    let previousRatio: { id: string; ratio: Decimal } | null = null;
    for (let log = 0; log <= 40; log += 0.5) {
      const player = Decimal.fromLog10(log);
      const rival = selectRival(buildStandings(NPC_LEADERS, player));
      if (!rival) break;
      // Same rival as last step: it must not pull away relative to the player.
      const ratio = rival.capital.divide(player);
      if (previousRatio && previousRatio.id === rival.id) expect(ratio.lt(previousRatio.ratio)).toBe(true);
      previousRatio = { id: rival.id, ratio };
    }
  });

  it('every NPC grows strictly slower than the player', () => {
    for (const npc of NPC_LEADERS) {
      const alpha = npcGrowthExponent(npc.id);
      let previous: Decimal | null = null;
      for (let log = 0; log <= 400; log += 10) {
        const player = Decimal.fromLog10(log);
        const ratio = npcCapitalAt(npc.capital, alpha, player).divide(player);
        if (previous) expect(ratio.lt(previous)).toBe(true);
        previous = ratio;
      }
    }
  });

  it('lets the player reach 1st place eventually', () => {
    expect(selectRival(buildStandings(NPC_LEADERS, Decimal.from(1e13)))).toBeNull();
  });

  it('stays finite and ordered past 1e308', () => {
    const standings = buildStandings(NPC_LEADERS, Decimal.fromLog10(500));
    expect(standings[0].id).toBe(PLAYER_ID);
    for (const entry of standings) {
      expect(Number.isFinite(entry.capital.mantissa)).toBe(true);
      expect(Number.isFinite(entry.capital.exponent)).toBe(true);
    }
  });
});

describe('buildStandings', () => {
  it('shows the player exactly once with consecutive places', () => {
    const standings = buildStandings(NPC_LEADERS, Decimal.from(5_000));
    expect(standings.filter((s) => s.isPlayer)).toHaveLength(1);
    expect(standings.map((s) => s.place)).toEqual(standings.map((_, i) => i + 1));
    expect(standings).toHaveLength(NPC_LEADERS.length + 1);
  });

  it('puts a fresh player (0 Capital) last', () => {
    const standings = buildStandings(NPC_LEADERS, Decimal.ZERO);
    expect(standings[standings.length - 1].id).toBe(PLAYER_ID);
  });

  it('ranks the player below an NPC with exactly the same capital', () => {
    // Both at 0: a tie, and overtaking requires strictly more Capital.
    const npc = { id: 'tie-npc', capital: Decimal.ZERO, icon: 'code' as const };
    const standings = buildStandings([npc], Decimal.ZERO);
    expect(standings[0].id).toBe('tie-npc');
    expect(standings[1].id).toBe(PLAYER_ID);
  });
});

describe('selectRival', () => {
  it('picks the NPC directly above the player and the exact gap', () => {
    const player = Decimal.from(13);
    const standings = buildStandings(NPC_LEADERS, player);
    const rival = selectRival(standings);
    const lowest = lowestNpc();
    expect(rival?.id).toBe(lowest.id);
    expect(rival?.gap.eq(rival.capital.subtract(player))).toBe(true);
    expect(rival?.capital.gt(player)).toBe(true);
    expect(rival?.progress).toBeGreaterThan(0);
    expect(rival?.progress).toBeLessThan(1);
  });

  it('targets the lowest NPC with full gap at 0 Capital', () => {
    const rival = selectRival(buildStandings(NPC_LEADERS, Decimal.ZERO));
    expect(rival?.id).toBe(lowestNpc().id);
    expect(rival?.gap.eq(lowestNpc().capital)).toBe(true);
    expect(rival?.progress).toBe(0);
  });

  it('returns null when the player is 1st', () => {
    expect(selectRival(buildStandings(NPC_LEADERS, Decimal.fromLog10(15)))).toBeNull();
  });

  it('compares with Decimal beyond 1e308 (player 1st and player just behind)', () => {
    const huge = [
      { id: 'big-a', capital: Decimal.fromLog10(400), icon: 'code' as const },
      { id: 'big-b', capital: Decimal.fromLog10(350), icon: 'code' as const },
    ];
    // NPCs grow by at most (1+P)^0.08, so at 1e390 big-b (1e350) stays below and big-a (1e400) above.
    const player = Decimal.fromLog10(390);
    const rival = selectRival(buildStandings(huge, player));
    expect(rival?.id).toBe('big-a');
    expect(rival?.gap.isPositive()).toBe(true);
    expect(rival?.progress).toBeLessThan(1e-9);

    expect(selectRival(buildStandings(huge, Decimal.fromLog10(1000)))).toBeNull();
  });

  it('returns null for a board without the player', () => {
    expect(selectRival([])).toBeNull();
  });
});
