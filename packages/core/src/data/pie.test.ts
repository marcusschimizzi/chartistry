import { describe, expect, it } from 'vitest';
import { arcCentroid, pie } from './pie';

const TAU = Math.PI * 2;
const data = [{ v: 1 }, { v: 2 }, { v: 1 }];

describe('pie', () => {
  it('allocates angle proportional to value and spans a full turn', () => {
    const slices = pie(data, { value: (d) => d.v });
    expect(slices[0]!.startAngle).toBe(0);
    // First slice is 1/4 of the circle.
    expect(slices[0]!.endAngle).toBeCloseTo(TAU / 4);
    // Second slice is 1/2.
    expect(slices[1]!.endAngle - slices[1]!.startAngle).toBeCloseTo(TAU / 2);
    // The last slice closes the circle.
    expect(slices[2]!.endAngle).toBeCloseTo(TAU);
  });

  it('keeps slices in data order while exposing original indices', () => {
    const slices = pie(data, { value: (d) => d.v });
    expect(slices.map((s) => s.index)).toEqual([0, 1, 2]);
  });

  it('reserves padAngle between slices', () => {
    const slices = pie(data, { value: (d) => d.v, padAngle: 0.1 });
    // Gap between slice 0 end and slice 1 start equals padAngle.
    expect(slices[1]!.startAngle - slices[0]!.endAngle).toBeCloseTo(0.1);
  });

  it('clamps negative values to zero', () => {
    const slices = pie([{ v: -5 }, { v: 5 }], { value: (d) => d.v });
    expect(slices[0]!.endAngle - slices[0]!.startAngle).toBe(0);
    expect(slices[1]!.endAngle - slices[1]!.startAngle).toBeCloseTo(TAU);
  });

  it('handles an all-zero total without NaN', () => {
    const slices = pie([{ v: 0 }, { v: 0 }], { value: (d) => d.v });
    for (const s of slices) expect(Number.isFinite(s.startAngle)).toBe(true);
  });

  it('records the mid angle for label placement', () => {
    const slices = pie([{ v: 1 }], { value: (d) => d.v });
    expect(slices[0]!.midAngle).toBeCloseTo(Math.PI);
  });
});

describe('arcCentroid', () => {
  it('places points clockwise from the top', () => {
    // midAngle 0 -> straight up.
    expect(arcCentroid(0, 0, 10, 0)).toEqual({ x: 0, y: -10 });
    // midAngle pi/2 -> to the right.
    const right = arcCentroid(0, 0, 10, Math.PI / 2);
    expect(right.x).toBeCloseTo(10);
    expect(right.y).toBeCloseTo(0);
  });
});
