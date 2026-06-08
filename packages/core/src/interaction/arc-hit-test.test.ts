import { describe, expect, it } from 'vitest';
import { angleFromCenter, arcHitTest, type ArcSlice } from './arc-hit-test';
import { pie } from '../data/pie';

const TAU = Math.PI * 2;

describe('angleFromCenter', () => {
  it('measures clockwise from 12 o’clock', () => {
    // Straight up is 0; right is a quarter turn; down is a half turn.
    expect(angleFromCenter(0, -10, 0, 0)).toBeCloseTo(0);
    expect(angleFromCenter(10, 0, 0, 0)).toBeCloseTo(Math.PI / 2);
    expect(angleFromCenter(0, 10, 0, 0)).toBeCloseTo(Math.PI);
    expect(angleFromCenter(-10, 0, 0, 0)).toBeCloseTo((3 * Math.PI) / 2);
  });

  it('normalizes into [0, 2π)', () => {
    const a = angleFromCenter(-1, -10, 0, 0); // just left of top
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(TAU);
  });
});

describe('arcHitTest', () => {
  // Two equal slices: right half [0, π], left half [π, 2π].
  const halves: ArcSlice[] = [
    { startAngle: 0, endAngle: Math.PI },
    { startAngle: Math.PI, endAngle: TAU },
  ];
  const opts = { cx: 0, cy: 0, innerRadius: 0, outerRadius: 50 };

  it('finds the slice under the point by angle', () => {
    expect(arcHitTest(20, 0, halves, opts)).toBe(0); // right → slice 0
    expect(arcHitTest(-20, 0, halves, opts)).toBe(1); // left → slice 1
  });

  it('misses points outside the outer radius', () => {
    expect(arcHitTest(60, 0, halves, opts)).toBe(-1);
  });

  it('misses points inside the inner radius of a donut', () => {
    const donut = { cx: 0, cy: 0, innerRadius: 20, outerRadius: 50 };
    expect(arcHitTest(10, 0, halves, donut)).toBe(-1); // in the hole
    expect(arcHitTest(35, 0, halves, donut)).toBe(0); // on the ring
  });

  it('misses the gap between padded slices', () => {
    // A small pie with a pad gap straddling the 3 o’clock direction.
    const slices: ArcSlice[] = [
      { startAngle: 0, endAngle: Math.PI / 2 - 0.1 },
      { startAngle: Math.PI / 2 + 0.1, endAngle: Math.PI },
    ];
    // Pointing exactly right (π/2) lands in the gap between the two slices.
    expect(arcHitTest(20, 0, slices, opts)).toBe(-1);
  });

  it('honors radiusTolerance for edge slack', () => {
    expect(arcHitTest(52, 0, halves, { ...opts, radiusTolerance: 4 })).toBe(0);
    expect(arcHitTest(52, 0, halves, { ...opts, radiusTolerance: 0 })).toBe(-1);
  });

  it('gives the shared boundary to the lower index', () => {
    // The point straight up sits on the boundary between slice 1 (ends at 2π≡0)
    // and slice 0 (starts at 0); slice 0 wins.
    expect(arcHitTest(0, -20, halves, opts)).toBe(0);
  });

  it('agrees with a real pie layout', () => {
    const data = [{ v: 3 }, { v: 1 }];
    const slices = pie(data, { value: (d) => d.v }); // 270° + 90°
    const center = { cx: 0, cy: 0, innerRadius: 0, outerRadius: 40 };
    // Slice 0 spans the first three quadrants; a point down-and-left is in it.
    expect(arcHitTest(0, 20, slices, center)).toBe(0);
    // Slice 1 is the final 90° wedge, top-left; a point up-and-left is in it.
    expect(arcHitTest(-20, -20, slices, center)).toBe(1);
  });
});
