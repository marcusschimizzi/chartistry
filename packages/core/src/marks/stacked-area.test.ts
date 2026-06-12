import { describe, expect, it } from 'vitest';
import { stackedAreaMark } from './stacked-area';
import { linearScale } from '../scales/linear';
import type { GroupNode, PolylineNode } from '../scene/nodes';

const data = [
  { a: 1, b: 2 },
  { a: 3, b: 1 },
];
const series = [
  { key: 'a', value: (d: (typeof data)[number]) => d.a, color: '#f00' },
  { key: 'b', value: (d: (typeof data)[number]) => d.b, color: '#00f' },
];
const xScale = linearScale({ domain: [0, 1], range: [0, 100] });
const yScale = linearScale({ domain: [0, 4], range: [100, 0] });

describe('stackedAreaMark', () => {
  it('produces one closed polygon per series, colored and keyed', () => {
    const node = stackedAreaMark({
      data,
      x: (_d, i) => i,
      series,
      xScale,
      yScale,
    }) as GroupNode;
    const polys = node.children as PolylineNode[];

    expect(polys).toHaveLength(2);
    expect(polys.every((p) => p.type === 'polyline' && p.closed === true)).toBe(true);
    expect(polys[0]!.fill).toBe('#f00');
    expect(polys[1]!.fill).toBe('#00f');
    // The band is a ring: upper boundary + lower boundary, so 2 points per datum.
    expect(polys[0]!.points).toHaveLength(4);
    expect(polys[0]!.key).toBe('area:a');
  });
});
