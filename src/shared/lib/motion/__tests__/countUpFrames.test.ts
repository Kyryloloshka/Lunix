import { Decimal } from '../../decimal';
import { buildCountUpFrames, COUNT_UP_STEPS, frameIndexForProgress } from '../countUpFrames';

const plain = (value: Decimal) => `${value.toNumber()}`;
const sci = (value: Decimal) => JSON.stringify(value.toJSON());

describe('buildCountUpFrames', () => {
  it('starts at `from`, ends exactly at `to` and has the requested number of frames', () => {
    const frames = buildCountUpFrames(Decimal.from(0), Decimal.from(100), plain, 5);
    expect(frames).toEqual(['0', '25', '50', '75', '100']);
  });

  it('uses the default step count', () => {
    const frames = buildCountUpFrames(Decimal.from(0), Decimal.from(1000), plain);
    expect(frames).toHaveLength(COUNT_UP_STEPS);
    expect(frames[frames.length - 1]).toBe('1000');
  });

  it('returns a single frame when nothing changes', () => {
    expect(buildCountUpFrames(Decimal.from(0), Decimal.from(0), plain)).toEqual(['0']);
    expect(buildCountUpFrames(Decimal.from(42), Decimal.from(42), plain, 10)).toEqual(['42']);
  });

  it('counts down and through negatives', () => {
    expect(buildCountUpFrames(Decimal.from(10), Decimal.from(-10), plain, 3)).toEqual(['10', '0', '-10']);
  });

  it('interpolates values beyond 1e308 without NaN or Infinity', () => {
    const from = Decimal.fromLog10(400);
    const to = Decimal.fromLog10(401);
    const frames = buildCountUpFrames(from, to, sci, 4);
    expect(frames).toHaveLength(4);
    expect(frames[0]).toBe(sci(from));
    expect(frames[3]).toBe(sci(to));
    for (const frame of frames) {
      const { m, e } = JSON.parse(frame) as { m: number; e: number };
      expect(Number.isFinite(m)).toBe(true);
      expect(e).toBeGreaterThanOrEqual(400);
      expect(e).toBeLessThanOrEqual(401);
    }
    // Monotonic between the endpoints.
    const values = frames.map((frame) => Decimal.fromJSON(JSON.parse(frame)));
    for (let i = 1; i < values.length; i += 1) expect(values[i].gte(values[i - 1])).toBe(true);
  });

  it('clamps invalid or extreme step counts', () => {
    expect(buildCountUpFrames(Decimal.from(0), Decimal.from(1), plain, 0)).toHaveLength(2);
    expect(buildCountUpFrames(Decimal.from(0), Decimal.from(1), plain, -5)).toHaveLength(2);
    expect(buildCountUpFrames(Decimal.from(0), Decimal.from(1), plain, Number.NaN)).toHaveLength(COUNT_UP_STEPS);
    expect(buildCountUpFrames(Decimal.from(0), Decimal.from(1), plain, 1e9).length).toBeLessThanOrEqual(60);
  });
});

describe('frameIndexForProgress', () => {
  it('maps progress to the nearest frame', () => {
    expect(frameIndexForProgress(0, 5)).toBe(0);
    expect(frameIndexForProgress(0.5, 5)).toBe(2);
    expect(frameIndexForProgress(1, 5)).toBe(4);
  });

  it('clamps out-of-range and non-finite progress', () => {
    expect(frameIndexForProgress(-1, 5)).toBe(0);
    expect(frameIndexForProgress(2, 5)).toBe(4);
    expect(frameIndexForProgress(Number.NaN, 5)).toBe(0);
    expect(frameIndexForProgress(Number.POSITIVE_INFINITY, 5)).toBe(4);
  });

  it('handles empty and single-frame lists', () => {
    expect(frameIndexForProgress(0.7, 1)).toBe(0);
    expect(frameIndexForProgress(0.7, 0)).toBe(0);
  });
});
