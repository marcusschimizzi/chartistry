import { describe, expect, it } from 'vitest';
import { nearestIndex, nearestPoint, withinPlot } from './hit-test';

describe('nearestIndex', () => {
  it('finds the closest position by absolute distance', () => {
    const positions = [0, 50, 100, 150];
    expect(nearestIndex(48, positions)).toBe(1);
    expect(nearestIndex(120, positions)).toBe(2);
    expect(nearestIndex(0, positions)).toBe(0);
  });

  it('tolerates unsorted positions', () => {
    expect(nearestIndex(95, [150, 0, 100, 50])).toBe(2);
  });

  it('returns -1 for empty input', () => {
    expect(nearestIndex(10, [])).toBe(-1);
  });

  it('respects maxDistance', () => {
    expect(nearestIndex(500, [0, 50, 100], 20)).toBe(-1);
    expect(nearestIndex(105, [0, 50, 100], 20)).toBe(2);
  });

  it('skips non-finite positions', () => {
    expect(nearestIndex(10, [NaN, 12, Infinity])).toBe(1);
  });
});

describe('nearestPoint', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ];

  it('finds the closest point in 2D, not just by x', () => {
    // Same x as points 1 and 2, but vertically nearer point 2.
    expect(nearestPoint(100, 90, points)).toBe(2);
    expect(nearestPoint(100, 10, points)).toBe(1);
    expect(nearestPoint(10, 5, points)).toBe(0);
  });

  it('returns -1 for empty input', () => {
    expect(nearestPoint(5, 5, [])).toBe(-1);
  });

  it('respects maxDistance (Euclidean)', () => {
    expect(nearestPoint(0, 0, [{ x: 30, y: 40 }], 40)).toBe(-1); // distance 50 > 40
    expect(nearestPoint(0, 0, [{ x: 30, y: 40 }], 60)).toBe(0); // distance 50 < 60
  });

  it('skips points with non-finite coordinates', () => {
    expect(nearestPoint(10, 10, [{ x: NaN, y: 0 }, { x: 12, y: 12 }])).toBe(1);
  });
});

describe('withinPlot', () => {
  it('detects points inside the plot rectangle', () => {
    expect(withinPlot(5, 5, 10, 10)).toBe(true);
    expect(withinPlot(0, 0, 10, 10)).toBe(true);
    expect(withinPlot(-1, 5, 10, 10)).toBe(false);
    expect(withinPlot(5, 11, 10, 10)).toBe(false);
  });
});
