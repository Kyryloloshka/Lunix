import { createEventBus } from '../createEventBus';

type TestEvent = { type: 'a'; n: number } | { type: 'b' };

describe('createEventBus', () => {
  it('delivers events synchronously, in subscription order', () => {
    const bus = createEventBus<TestEvent>();
    const seen: string[] = [];
    bus.subscribe((e) => seen.push(`1:${e.type}`));
    bus.subscribe((e) => seen.push(`2:${e.type}`));
    bus.emit({ type: 'a', n: 1 });
    expect(seen).toEqual(['1:a', '2:a']);
  });

  it('survives a throwing subscriber: others still run and emit does not throw', () => {
    const onError = jest.fn();
    const bus = createEventBus<TestEvent>(onError);
    const after = jest.fn();
    bus.subscribe(() => { throw new Error('boom'); });
    bus.subscribe(after);
    expect(() => bus.emit({ type: 'b' })).not.toThrow();
    expect(after).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('survives a throwing error reporter', () => {
    const bus = createEventBus<TestEvent>(() => { throw new Error('reporter'); });
    const after = jest.fn();
    bus.subscribe(() => { throw new Error('boom'); });
    bus.subscribe(after);
    expect(() => bus.emit({ type: 'b' })).not.toThrow();
    expect(after).toHaveBeenCalled();
  });

  it('unsubscribe is idempotent and stops delivery', () => {
    const bus = createEventBus<TestEvent>();
    const listener = jest.fn();
    const other = jest.fn();
    const off = bus.subscribe(listener);
    bus.subscribe(other);
    off();
    off();
    bus.emit({ type: 'b' });
    expect(listener).not.toHaveBeenCalled();
    expect(other).toHaveBeenCalledTimes(1);
  });

  it('applies subscribe/unsubscribe made during an emit from the next emit', () => {
    const bus = createEventBus<TestEvent>();
    const late = jest.fn();
    const off = bus.subscribe(() => {
      off();
      bus.subscribe(late);
    });
    bus.emit({ type: 'b' });
    expect(late).not.toHaveBeenCalled();
    bus.emit({ type: 'b' });
    expect(late).toHaveBeenCalledTimes(1);
  });

  it('reports subscribers and clears them', () => {
    const bus = createEventBus<TestEvent>();
    expect(bus.hasSubscribers()).toBe(false);
    bus.subscribe(() => undefined);
    expect(bus.hasSubscribers()).toBe(true);
    bus.clear();
    expect(bus.hasSubscribers()).toBe(false);
  });
});
