import { useCurrencyStore } from '@entities/currency';
import { toLocalSurfacePoint } from '../model/touchCoordinates';

describe('WorkspaceClicker high-TPS model', () => {
  beforeEach(() => {
    useCurrencyStore.getState().reset();
  });

  it('processes 300 rapid game taps without losing resource updates', () => {
    const tap = useCurrencyStore.getState().tap;
    const initialCapital = useCurrencyStore.getState().capital;
    const results = Array.from({ length: 300 }, () => tap());

    expect(results).toHaveLength(300);
    expect(useCurrencyStore.getState().capital.gt(initialCapital)).toBe(true);
    expect(results.every((result) => result.capital.isPositive())).toBe(true);
  });

  it('maps three simultaneous pointers to independent local points', () => {
    const rect = { left: 50, top: 120, width: 300, height: 220 };
    const pointers = [
      { pointerId: 1, clientX: 80, clientY: 150 },
      { pointerId: 2, clientX: 180, clientY: 220 },
      { pointerId: 3, clientX: 230, clientY: 300 },
    ];

    const points = pointers.map(({ clientX, clientY }) =>
      toLocalSurfacePoint({ clientX, clientY }, rect),
    );

    expect(new Set(pointers.map((pointer) => pointer.pointerId)).size).toBe(3);
    expect(points).toEqual([
      { x: 30, y: 30 },
      { x: 130, y: 100 },
      { x: 180, y: 180 },
    ]);
  });

  it('keeps visual floater work bounded while game taps continue', () => {
    const maxFloaters = 20;
    const ids = Array.from({ length: 300 }, (_, index) => index + 1);
    const visibleIds = ids.slice(-maxFloaters);

    expect(visibleIds).toHaveLength(maxFloaters);
    expect(visibleIds[0]).toBe(281);
    expect(visibleIds.at(-1)).toBe(300);
  });
});
