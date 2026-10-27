import { getFlowTimeRatio, isInStressZone, STRESS_ZONE_THRESHOLD } from '../model/stressZone';

describe('stress zone', () => {
  it('starts above the throttling threshold, not at it', () => {
    expect(isInStressZone(STRESS_ZONE_THRESHOLD)).toBe(false);
    expect(isInStressZone(STRESS_ZONE_THRESHOLD + 0.01)).toBe(true);
    expect(isInStressZone(0)).toBe(false);
    expect(isInStressZone(100)).toBe(true);
  });

  it('never treats non-finite stress as in the zone', () => {
    expect(isInStressZone(Number.NaN)).toBe(false);
    expect(isInStressZone(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe('getFlowTimeRatio', () => {
  it('maps remaining time to a clamped 0..1 share', () => {
    expect(getFlowTimeRatio(10_000, 10_000)).toBe(1);
    expect(getFlowTimeRatio(2_500, 10_000)).toBe(0.25);
    expect(getFlowTimeRatio(0, 10_000)).toBe(0);
    expect(getFlowTimeRatio(-5, 10_000)).toBe(0);
    expect(getFlowTimeRatio(20_000, 10_000)).toBe(1);
  });

  it('is 0 for an invalid total or non-finite input', () => {
    expect(getFlowTimeRatio(100, 0)).toBe(0);
    expect(getFlowTimeRatio(100, -1)).toBe(0);
    expect(getFlowTimeRatio(Number.NaN, 10_000)).toBe(0);
    expect(getFlowTimeRatio(100, Number.POSITIVE_INFINITY)).toBe(0);
  });
});
