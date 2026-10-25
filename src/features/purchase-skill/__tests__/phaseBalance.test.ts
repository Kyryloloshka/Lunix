import { Decimal } from '@shared/lib/decimal';
import {
  getMilestoneMultiplier,
  getSkillCost,
  LEADERSHIP_PERKS,
  SKILLS,
  TECH_UPGRADES,
  type ProducerSkill,
  type SkillResource,
} from '@entities/skill';
import { CAREER_RANKS, MAX_RANK, isResourceUnlocked } from '@entities/career-rank';
import { RHYTHM_CONFIG, useCurrencyStore } from '@entities/currency';
import { canPromote, isSkillUnlocked, useSkillStore } from '../model/skillStore';

/**
 * T-016 stage 6: phase pacing on the real engine (currency + skill stores with the T-014 Flow/stress
 * rhythm). A fixed strategy plays a fresh save to CEO with an injected clock and a seeded crit roll:
 * - taps at a steady 4/s and rests when stress reaches 60%, resuming at 15% (T-014 rest breaks);
 * - taps go to the resource the next promotion waits on, else to Capital once it exists;
 * - every second it buys greedily: leadership perks and tech upgrades as soon as affordable (Influence
 *   only above the next promotion's cost), perks while they cost < 2 min of income, then per currency
 *   one producer chosen by cost per unit of output, saving up for it when it is not affordable yet;
 * - promotes as soon as the requirements are met.
 * Targets: docs/economy/phases.md §8 (approved), ±20%. Set PHASE_SIM_DEBUG=1 to print the runs.
 */

/** Live loop ticks every 200 ms; 500 ms gives the same timings (±0.3 min) at less than half the cost. */
const STEP_MS = 500;
const BUY_EVERY_MS = 1_000;
const MAX_SIM_SECONDS = 5 * 3_600;
const TAPS_PER_SEC = 4;
const REST_AT_STRESS = 60;
const RESUME_AT_STRESS = 15;
/** Prototype rule: a perk is worth it while it costs less than two minutes of that resource's income. */
const PERK_PAYBACK_SECONDS = 120;
/** Influence producers are valued highly so the strategy actually builds the promotion currency. */
const INFLUENCE_WEIGHT = 3e3;
/** Same strategy as the prototype that produced the approved targets: always the best payback. */
const BEST_PAYBACK = 1;
/** "Cheapest useful": the cheapest producer that pays back within 2× of the best one. */
const CHEAPEST_USEFUL = 2;

const producers = SKILLS.filter((skill): skill is ProducerSkill => skill.kind === 'producer');
const perks = SKILLS.filter((skill) => skill.kind === 'perk');
const UPGRADES_BY_EFFECT = [...TECH_UPGRADES, ...LEADERSHIP_PERKS];

function log10(value: Decimal): number {
  if (!value.isPositive()) return Number.NEGATIVE_INFINITY;
  return Math.log10(value.mantissa) + value.exponent;
}

/** Cost and output in log10 space: scoring runs ~10k times, Decimal allocations would dominate. */
const PRODUCER_LOG = Object.fromEntries(producers.map((producer) => [producer.id, {
  base: log10(producer.baseCost),
  growth: Math.log10(producer.costGrowth),
  perLevel: log10(producer.perLevel),
}]));

/** Deterministic crit roll (mulberry32). */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Influence the next promotion consumes: never spend it on perks or upgrades. */
function influenceReserve(rank: number): Decimal {
  const next = CAREER_RANKS[rank + 1];
  return next?.requirements.reduce(
    (total, requirement) => (requirement.type === 'spend' ? total.add(requirement.amount) : total),
    Decimal.ZERO,
  ) ?? Decimal.ZERO;
}

/** Output multiplier of each producer right now: milestones × its tech upgrades × leadership perks. */
function producerMultipliers(levels: Record<string, number>, purchased: Set<string>): Record<string, number> {
  const branch: Record<string, number> = {};
  const skill: Record<string, number> = {};
  for (const upgrade of UPGRADES_BY_EFFECT) {
    if (!purchased.has(upgrade.id)) continue;
    const { effect } = upgrade;
    if (effect.type === 'skillMultiplier') skill[effect.skillId] = (skill[effect.skillId] ?? 1) * effect.multiplier;
    else branch[effect.branch] = (branch[effect.branch] ?? 1) * effect.multiplier;
  }
  return Object.fromEntries(producers.map((producer) => [
    producer.id,
    getMilestoneMultiplier(levels[producer.id] ?? 0) * (skill[producer.id] ?? 1) * (branch[producer.branch] ?? 1),
  ]));
}

/** Store state is immutable, so the same levels/upgrades references mean the same multipliers. */
let multiplierCache: { levels: object; upgrades: object; value: Record<string, number> } | null = null;
function cachedMultipliers(levels: Record<string, number>, upgrades: string[]): Record<string, number> {
  if (multiplierCache?.levels !== levels || multiplierCache.upgrades !== upgrades) {
    multiplierCache = { levels, upgrades, value: producerMultipliers(levels, new Set(upgrades)) };
  }
  return multiplierCache.value;
}

function chooseTapResource(): SkillResource {
  const { currentRank } = useSkillStore.getState();
  const currency = useCurrencyStore.getState();
  const next = CAREER_RANKS[currentRank + 1];
  const open = (resource: SkillResource) => isResourceUnlocked(resource, currentRank);
  if (next) {
    const earnedTarget = (resource: 'cognitive' | 'capital'): Decimal | undefined => {
      for (const requirement of next.requirements) {
        if (requirement.type === 'earned' && requirement.resource === resource) return requirement.amount;
      }
      return undefined;
    };
    const earnedCapital = earnedTarget('capital');
    for (const requirement of next.requirements) {
      if (
        requirement.type === 'spend'
        && open('influence')
        && currency.influence.lt(requirement.amount)
        // Prototype rule: start networking once 30% of the Capital requirement is earned.
        && (!earnedCapital || currency.totalCapitalEarned.gte(earnedCapital.multiplyScalar(0.3)))
      ) return 'influence';
    }
    if (earnedCapital && open('capital') && currency.totalCapitalEarned.lt(earnedCapital)) return 'capital';
    const earnedCognitive = earnedTarget('cognitive');
    if (earnedCognitive && currency.totalCognitiveEarned.lt(earnedCognitive)) return 'cognitive';
  }
  return open('capital') ? 'capital' : 'cognitive';
}

/** Greedy passes until nothing more is bought. Returns the number of purchases. */
function buyGreedy(usefulPaybackFactor: number): number {
  let total = 0;
  for (let guard = 0; guard < 1_000; guard += 1) {
    let bought = 0;
    const skills = useSkillStore.getState();
    const purchased = new Set(skills.purchasedUpgrades);
    const reserve = influenceReserve(skills.currentRank);
    const freeInfluence = () => useCurrencyStore.getState().influence.subtract(reserve);

    for (const perk of LEADERSHIP_PERKS) {
      if (purchased.has(perk.id) || skills.currentRank < perk.unlockRank) continue;
      if (freeInfluence().gte(perk.cost) && useSkillStore.getState().buyUpgrade(perk.id)) bought += 1;
    }
    for (const upgrade of TECH_UPGRADES) {
      if (purchased.has(upgrade.id) || skills.currentRank < upgrade.unlockRank) continue;
      const required = upgrade.requiredSkill;
      if (required && (useSkillStore.getState().levels[required.skillId] ?? 0) < required.level) continue;
      const budget = upgrade.costResource === 'influence'
        ? freeInfluence()
        : useCurrencyStore.getState()[upgrade.costResource];
      if (budget.gte(upgrade.cost) && useSkillStore.getState().buyUpgrade(upgrade.id)) bought += 1;
    }
    const { rates } = useCurrencyStore.getState();
    const perSec: Record<SkillResource, Decimal> = {
      cognitive: rates.cognitivePerSec,
      capital: rates.capitalPerSec,
      influence: rates.influencePerSec,
    };
    for (const perk of perks) {
      const { levels, currentRank } = useSkillStore.getState();
      const level = levels[perk.id] ?? 0;
      if (!isSkillUnlocked(perk.id, levels, currentRank) || level >= (perk.maxLevel ?? Infinity)) continue;
      const cost = getSkillCost(perk.baseCost, perk.costGrowth, level);
      const cheap = cost.lt(perSec[perk.costResource].add(1).multiplyScalar(PERK_PAYBACK_SECONDS));
      if (cheap && useCurrencyStore.getState()[perk.costResource].gte(cost)) {
        bought += useSkillStore.getState().buy(perk.id, 1);
      }
    }
    for (const currency of ['cognitive', 'capital'] as const) {
      const { levels, currentRank, purchasedUpgrades } = useSkillStore.getState();
      const multipliers = cachedMultipliers(levels, purchasedUpgrades);
      const candidates: { producer: ProducerSkill; logCost: number; score: number }[] = [];
      for (const producer of producers) {
        if (producer.costResource !== currency || !isSkillUnlocked(producer.id, levels, currentRank)) continue;
        const log = PRODUCER_LOG[producer.id];
        const logCost = log.base + (levels[producer.id] ?? 0) * log.growth;
        const weight = producer.produces === 'influence' ? INFLUENCE_WEIGHT : 1;
        // log10 of cost per unit of output: lower pays back sooner.
        const score = logCost - log.perLevel - Math.log10(multipliers[producer.id] * weight);
        candidates.push({ producer, logCost, score });
      }
      if (candidates.length === 0) continue;
      const bestScore = Math.min(...candidates.map((candidate) => candidate.score));
      const { producer } = candidates
        .filter((candidate) => candidate.score <= bestScore + Math.log10(usefulPaybackFactor) + 1e-9)
        .reduce((cheapest, candidate) => (candidate.logCost < cheapest.logCost ? candidate : cheapest));
      const cost = getSkillCost(producer.baseCost, producer.costGrowth, levels[producer.id] ?? 0);
      if (useCurrencyStore.getState()[currency].gte(cost)) {
        bought += useSkillStore.getState().buy(producer.id, 1);
      }
    }
    total += bought;
    if (bought === 0) break;
  }
  return total;
}

interface PhaseRun {
  firstPurchaseSec: number | null;
  /** Minutes of play when each rank was reached (index = rank id). */
  rankMinutes: number[];
  /** Longest stretch without any purchase or promotion while on each rank, seconds. */
  maxGapByRank: number[];
  flowShare: number;
  overloadShare: number;
  reachedCeo: boolean;
}

function simulatePhases(usefulPaybackFactor: number, seed = 16): PhaseRun {
  useCurrencyStore.getState().reset();
  useSkillStore.getState().reset();
  const start = 1_000_000;
  let now = start;
  // Plain replacements rather than jest.spyOn: a jest mock records every call, and a run makes ~10^5.
  const realNow = Date.now;
  const realRandom = Math.random;
  Date.now = () => now;
  Math.random = seededRandom(seed);

  const tapEveryMs = 1_000 / TAPS_PER_SEC;
  let nextTapAt = 0;
  let resting = false;
  let lastEventMs = 0;
  let firstPurchaseSec: number | null = null;
  let flowMs = 0;
  let overloadMs = 0;
  const rankMinutes: number[] = [0];
  const maxGapByRank: number[] = CAREER_RANKS.map(() => 0);
  const recordEvent = (elapsedMs: number, rank: number) => {
    maxGapByRank[rank] = Math.max(maxGapByRank[rank], (elapsedMs - lastEventMs) / 1_000);
    lastEventMs = elapsedMs;
  };

  try {
    for (let elapsed = 0; elapsed < MAX_SIM_SECONDS * 1_000; elapsed += STEP_MS) {
      const { stress } = useCurrencyStore.getState();
      if (!resting && stress >= REST_AT_STRESS) resting = true;
      else if (resting && stress <= RESUME_AT_STRESS) resting = false;

      // Taps land at their own timestamps inside the step, like real input between loop ticks.
      while (nextTapAt < elapsed + STEP_MS) {
        if (!resting) {
          now = start + nextTapAt;
          useSkillStore.getState().tap();
        }
        nextTapAt += tapEveryMs;
      }
      const elapsedAfter = elapsed + STEP_MS;
      now = start + elapsedAfter;
      useCurrencyStore.getState().tick(STEP_MS / 1_000);
      const currency = useCurrencyStore.getState();
      if (currency.flow.isActive) flowMs += STEP_MS;
      if (currency.stress > RHYTHM_CONFIG.stress.overloadThreshold) overloadMs += STEP_MS;

      if (elapsedAfter % BUY_EVERY_MS !== 0) continue;
      const rank = useSkillStore.getState().currentRank;
      if (buyGreedy(usefulPaybackFactor) > 0) {
        firstPurchaseSec ??= elapsedAfter / 1_000;
        recordEvent(elapsedAfter, rank);
      }
      if (canPromote(rank + 1) && useSkillStore.getState().promote()) {
        recordEvent(elapsedAfter, rank);
        rankMinutes[rank + 1] = elapsedAfter / 60_000;
        if (rank + 1 === MAX_RANK) break;
      }
      const resource = chooseTapResource();
      if (useSkillStore.getState().tapResource !== resource) useSkillStore.getState().setTapResource(resource);
    }
  } finally {
    Date.now = realNow;
    Math.random = realRandom;
  }

  const totalMs = now - start;
  const run: PhaseRun = {
    firstPurchaseSec,
    rankMinutes,
    maxGapByRank,
    flowShare: flowMs / totalMs,
    overloadShare: overloadMs / totalMs,
    reachedCeo: useSkillStore.getState().currentRank === MAX_RANK,
  };
  if (process.env.PHASE_SIM_DEBUG) {
    // eslint-disable-next-line no-console
    console.log(`factor ${usefulPaybackFactor}`, JSON.stringify({
      ...run,
      rankMinutes: run.rankMinutes.map((minutes) => Number(minutes.toFixed(1))),
      upgrades: useSkillStore.getState().purchasedUpgrades.length,
    }));
  }
  return run;
}

/**
 * Approved targets in minutes (docs/economy/phases.md §8), checked at ±20%. Ranks 1–2 are steps inside
 * the study phase with a "~" target: only the upper bound is checked there, since the first purchase
 * (≤ 10 s) and the no-purchase gap (≤ 90 s) already guard the early pace.
 */
const RANK_TARGET_MINUTES: [rank: number, low: number | null, high: number][] = [
  [1, null, 1],
  [2, null, 3],
  [3, 4, 5], // Trainee: first salary, phase 2
  [4, 10, 10], // Junior
  [5, 25, 25], // Middle: Influence, phase 3
  [6, 50, 60], // Senior
  [7, 80, 80], // Tech Lead
  [8, 110, 110], // Principal
  [9, 140, 140], // CTO
  [10, 150, 180], // CEO: 2.5–3 h
];
const TOLERANCE = 0.2;
const MAX_GAP_SECONDS = 90;

describe('phase pacing on the real engine (T-016 stage 6)', () => {
  let bestPayback: PhaseRun;
  let cheapestUseful: PhaseRun;
  beforeAll(() => {
    bestPayback = simulatePhases(BEST_PAYBACK);
    cheapestUseful = simulatePhases(CHEAPEST_USEFUL);
  });

  it('reaches CEO with both strategies and makes the first purchase within 10 s', () => {
    for (const run of [bestPayback, cheapestUseful]) {
      expect(run.reachedCeo).toBe(true);
      expect(run.firstPurchaseSec).not.toBeNull();
      expect(run.firstPurchaseSec!).toBeLessThanOrEqual(10);
    }
  });

  it.each(RANK_TARGET_MINUTES)('reaches rank %i within ±20%% of the target', (rank, low, high) => {
    const minutes = bestPayback.rankMinutes[rank];
    if (low !== null) expect(minutes).toBeGreaterThanOrEqual(low * (1 - TOLERANCE));
    expect(minutes).toBeLessThanOrEqual(high * (1 + TOLERANCE));
  });

  it('always has a useful purchase or promotion within 90 s', () => {
    cheapestUseful.maxGapByRank.slice(0, MAX_RANK).forEach((gap) => {
      expect(gap).toBeLessThanOrEqual(MAX_GAP_SECONDS);
    });
  });

  it('keeps a player who takes rest breaks out of overload', () => {
    expect(bestPayback.overloadShare).toBe(0);
    expect(cheapestUseful.overloadShare).toBe(0);
  });
});
