import { describe, expect, it } from 'vitest';
import { stackedAreaExtent, stackedAreaLayout } from './stacked-area';

const data = [
  { a: 1, b: 2 },
  { a: 3, b: 1 },
];
const series = [
  { key: 'a', value: (d: (typeof data)[number]) => d.a },
  { key: 'b', value: (d: (typeof data)[number]) => d.b },
];
const bounds = (segs: { y0: number; y1: number }[]) => segs.map((s) => [s.y0, s.y1]);

describe('stackedAreaLayout', () => {
  it('stacks from the baseline with the zero offset', () => {
    const rows = stackedAreaLayout(data, series, 'zero');
    expect(bounds(rows[0]!)).toEqual([
      [0, 1],
      [1, 3],
    ]);
    expect(bounds(rows[1]!)).toEqual([
      [0, 3],
      [3, 4],
    ]);
  });

  it('centers each datum on zero with the silhouette offset', () => {
    const rows = stackedAreaLayout(data, series, 'silhouette');
    expect(bounds(rows[0]!)).toEqual([
      [-1.5, -0.5],
      [-0.5, 1.5],
    ]); // total 3 → center 1.5
    expect(bounds(rows[1]!)).toEqual([
      [-2, 1],
      [1, 2],
    ]); // total 4 → center 2
  });
});

describe('stackedAreaExtent', () => {
  it('spans the full stack for the zero offset', () => {
    expect(stackedAreaExtent(data, series, 'zero')).toEqual([0, 4]);
  });

  it('is symmetric for the silhouette offset', () => {
    expect(stackedAreaExtent(data, series, 'silhouette')).toEqual([-2, 2]);
  });
});
