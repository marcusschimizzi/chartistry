import { describe, expect, it } from 'vitest';
import { extent, linearScale } from './linear';

describe('linearScale', () => {
  it('maps domain endpoints to range endpoints', () => {
    const scale = linearScale({ domain: [0, 100], range: [0, 500] });
    expect(scale(0)).toBe(0);
    expect(scale(100)).toBe(500);
    expect(scale(50)).toBe(250);
  });

  it('handles inverted ranges (y-axis convention)', () => {
    const scale = linearScale({ domain: [0, 10], range: [400, 0] });
    expect(scale(0)).toBe(400);
    expect(scale(10)).toBe(0);
    expect(scale(5)).toBe(200);
  });

  it('inverts positions back to domain values', () => {
    const scale = linearScale({ domain: [0, 100], range: [0, 500] });
    expect(scale.invert(250)).toBe(50);
    expect(scale.invert(0)).toBe(0);
  });

  it('clamps when requested', () => {
    const scale = linearScale({ domain: [0, 10], range: [0, 100], clamp: true });
    expect(scale(-5)).toBe(0);
    expect(scale(20)).toBe(100);
  });

  it('expands to nice boundaries when nice is set', () => {
    const scale = linearScale({ domain: [3, 97], range: [0, 100], nice: true });
    expect(scale.domain[0]).toBe(0);
    expect(scale.domain[1]).toBe(100);
  });

  it('survives a zero-width domain without dividing by zero', () => {
    const scale = linearScale({ domain: [5, 5], range: [0, 100] });
    expect(Number.isFinite(scale(5))).toBe(true);
  });

  it('reports zero bandwidth', () => {
    expect(linearScale({ domain: [0, 1], range: [0, 1] }).bandwidth()).toBe(0);
  });
});

describe('extent', () => {
  it('finds min and max, ignoring non-finite values', () => {
    expect(extent([3, 1, 4, 1, 5, NaN, 9, Infinity])).toEqual([1, 9]);
  });

  it('pads a degenerate single-value extent', () => {
    expect(extent([7, 7, 7])).toEqual([7, 8]);
  });

  it('falls back to [0, 1] for empty input', () => {
    expect(extent([])).toEqual([0, 1]);
  });
});
