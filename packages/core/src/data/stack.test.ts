import { describe, expect, it } from 'vitest';
import { seriesExtent, stack, stackExtent } from './stack';

interface Row {
  a: number;
  b: number;
}

const data: Row[] = [
  { a: 2, b: 3 },
  { a: 5, b: 1 },
];
const series = [
  { key: 'a', value: (d: Row) => d.a },
  { key: 'b', value: (d: Row) => d.b },
];

describe('stack', () => {
  it('accumulates series into contiguous segments per datum', () => {
    const result = stack(data, series);
    expect(result[0]).toEqual([
      { key: 'a', y0: 0, y1: 2, value: 2 },
      { key: 'b', y0: 2, y1: 5, value: 3 },
    ]);
    expect(result[1]).toEqual([
      { key: 'a', y0: 0, y1: 5, value: 5 },
      { key: 'b', y0: 5, y1: 6, value: 1 },
    ]);
  });

  it('stacks negatives below the baseline independently of positives', () => {
    const mixed = [{ a: 4, b: -3 }];
    const result = stack(mixed, series);
    expect(result[0]).toEqual([
      { key: 'a', y0: 0, y1: 4, value: 4 },
      { key: 'b', y0: -3, y1: 0, value: -3 },
    ]);
  });
});

describe('stackExtent', () => {
  it('spans the largest stacked total', () => {
    expect(stackExtent(data, series)).toEqual([0, 6]);
  });

  it('includes negative totals', () => {
    expect(stackExtent([{ a: -2, b: -3 }], series)).toEqual([-5, 0]);
  });
});

describe('seriesExtent', () => {
  it('spans every individual series value and includes zero', () => {
    expect(seriesExtent(data, series)).toEqual([0, 5]);
  });
});
