import { Decimal } from '@shared/lib/decimal';
import { gameEvents, type GameEvent } from '@entities/game-events';
import { FLOW_COMBO_THRESHOLD, MAX_TICK_SECONDS, useCurrencyStore } from '../currencyStore';
import { RHYTHM_CONFIG } from '../rhythm';

let events: GameEvent[] = [];
let off: () => void;

beforeEach(() => {
  useCurrencyStore.getState().reset();
  events = [];
  off = gameEvents.subscribe((event) => events.push(event));
});
afterEach(() => {
  off();
  jest.restoreAllMocks();
});

const types = () => events.map((event) => event.type);

describe('currency events (T-022)', () => {
  it('a tap emits exactly one tap event with the payout', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const result = useCurrencyStore.getState().tap('cognitive');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'tap', resource: 'cognitive', crit: false, flow: false });
    expect((events[0] as Extract<GameEvent, { type: 'tap' }>).amount).toBe(result.amount);
  });

  it('flags crit taps', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    useCurrencyStore.getState().tap('capital');
    expect(events[0]).toMatchObject({ type: 'tap', resource: 'capital', crit: true });
  });

  it('emits flow_started once, on the tap that opens Flow', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    for (let i = 0; i < FLOW_COMBO_THRESHOLD - 1; i += 1) useCurrencyStore.getState().tap();
    expect(types()).not.toContain('flow_started');
    useCurrencyStore.getState().tap();
    expect(types().filter((t) => t === 'flow_started')).toHaveLength(1);
    useCurrencyStore.getState().tap();
    expect(types().filter((t) => t === 'flow_started')).toHaveLength(1);
    expect(events.at(-1)).toMatchObject({ type: 'tap', flow: true });
  });

  it('emits flow_ended once when the Flow timer runs out', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    for (let i = 0; i < FLOW_COMBO_THRESHOLD; i += 1) useCurrencyStore.getState().tap();
    events = [];
    const steps = Math.ceil(RHYTHM_CONFIG.flow.durationMs / 1000 / MAX_TICK_SECONDS) + 2;
    for (let i = 0; i < steps; i += 1) useCurrencyStore.getState().tick(MAX_TICK_SECONDS);
    expect(types()).toEqual(['flow_ended']);
  });

  it('emits stress_overload_entered once when stress crosses the threshold, not while staying above', () => {
    useCurrencyStore.setState({ stress: RHYTHM_CONFIG.stress.overloadThreshold - 0.01 });
    useCurrencyStore.getState().addStress(5);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'stress_overload_entered' });
    useCurrencyStore.getState().addStress(5);
    expect(types()).toEqual(['stress_overload_entered']);
  });

  it('a tap that pushes stress over the threshold emits tap, then the overload event', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    useCurrencyStore.setState({ stress: RHYTHM_CONFIG.stress.overloadThreshold });
    useCurrencyStore.getState().tap();
    expect(types()).toEqual(['tap', 'stress_overload_entered']);
  });

  it('plain ticks, spending, hydrate and reset emit nothing', () => {
    const store = useCurrencyStore.getState();
    store.addResources({ capital: Decimal.from(5) });
    store.tick(1);
    expect(store.spendCapital(Decimal.from(1))).toBe(true);
    expect(store.spendCapital(Decimal.from(1e9))).toBe(false);
    store.hydrate({
      capital: Decimal.from(1),
      cognitive: Decimal.ZERO,
      influence: Decimal.ZERO,
      stress: 99,
      totalCapitalEarned: Decimal.from(1),
      totalCognitiveEarned: Decimal.ZERO,
    });
    store.reset();
    expect(events).toEqual([]);
  });
});
