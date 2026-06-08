import { describe, expect, it } from 'vitest';
import { resamplePoints } from './resample';
import type { Point } from '../types';

const line: Point[] = [
  { x: 0, y: 0 },
  { x: 10, y: 10 },
];

describe('resamplePoints', () => {
  it('keeps the endpoints fixed when adding points', () => {
    const out = resamplePoints(line, 5);
    expect(out).toHaveLength(5);
    expect(out[0]).toEqual({ x: 0, y: 0 });
    expect(out[4]).toEqual({ x: 10, y: 10 });
  });

  it('places extra points on the existing segment (shape preserved)', () => {
    const out = resamplePoints(line, 3);
    // The middle sample lands exactly on the segment midpoint.
    expect(out[1]).toEqual({ x: 5, y: 5 });
  });

  it('samples a multi-segment path by index fraction', () => {
    const path: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
    ];
    const out = resamplePoints(path, 5);
    expect(out.map((p) => p.x)).toEqual([0, 5, 10, 15, 20]);
  });

  it('repeats a single point to the requested count', () => {
    expect(resamplePoints([{ x: 3, y: 4 }], 3)).toEqual([
      { x: 3, y: 4 },
      { x: 3, y: 4 },
      { x: 3, y: 4 },
    ]);
  });

  it('handles degenerate counts', () => {
    expect(resamplePoints(line, 0)).toEqual([]);
    expect(resamplePoints(line, 1)).toEqual([{ x: 0, y: 0 }]);
  });
});
