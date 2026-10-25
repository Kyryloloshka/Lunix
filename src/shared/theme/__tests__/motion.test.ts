import { durations, easings, isReducedMotion, resolveDuration, springs } from '../motion';

describe('motion tokens', () => {
  it('defines the agreed duration scale in ascending order', () => {
    expect(durations).toEqual({ instant: 90, fast: 160, base: 240, slow: 400, celebrate: 1200 });
    const values = Object.values(durations);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
  });

  it('uses valid cubic-bezier curves (x in 0..1)', () => {
    for (const [x1, y1, x2, y2] of Object.values(easings)) {
      for (const n of [x1, y1, x2, y2]) expect(Number.isFinite(n)).toBe(true);
      expect(x1).toBeGreaterThanOrEqual(0);
      expect(x1).toBeLessThanOrEqual(1);
      expect(x2).toBeGreaterThanOrEqual(0);
      expect(x2).toBeLessThanOrEqual(1);
    }
  });

  it('has positive spring configs', () => {
    for (const spring of Object.values(springs)) {
      expect(spring.damping).toBeGreaterThan(0);
      expect(spring.stiffness).toBeGreaterThan(0);
      expect(spring.mass).toBeGreaterThan(0);
    }
  });
});

describe('resolveDuration', () => {
  it('returns the token duration when motion is allowed', () => {
    expect(resolveDuration('base', false)).toBe(240);
    expect(resolveDuration('celebrate', false, 'fade')).toBe(1200);
    expect(resolveDuration(333, false)).toBe(333);
  });

  it('makes movement instant under reduced motion', () => {
    expect(resolveDuration('base', true)).toBe(0);
    expect(resolveDuration('celebrate', true, 'motion')).toBe(0);
    expect(resolveDuration(500, true)).toBe(0);
  });

  it('keeps fades under reduced motion but caps them at fast', () => {
    expect(resolveDuration('instant', true, 'fade')).toBe(90);
    expect(resolveDuration('slow', true, 'fade')).toBe(durations.fast);
    expect(resolveDuration('celebrate', true, 'fade')).toBe(durations.fast);
  });

  it('treats invalid durations as 0', () => {
    expect(resolveDuration(-10, false)).toBe(0);
    expect(resolveDuration(0, false)).toBe(0);
    expect(resolveDuration(Number.NaN, false)).toBe(0);
    expect(resolveDuration(Number.POSITIVE_INFINITY, false)).toBe(0);
    expect(resolveDuration(Number.NaN, true, 'fade')).toBe(0);
  });
});

describe('isReducedMotion', () => {
  it('follows the OS until the player makes a choice', () => {
    expect(isReducedMotion(null, false)).toBe(false);
    expect(isReducedMotion(null, true)).toBe(true);
  });

  it('lets an explicit player choice win over the OS', () => {
    expect(isReducedMotion(true, false)).toBe(true);
    expect(isReducedMotion(false, true)).toBe(false);
    expect(isReducedMotion(true, true)).toBe(true);
    expect(isReducedMotion(false, false)).toBe(false);
  });
});
