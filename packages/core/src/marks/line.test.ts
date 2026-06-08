import { describe, expect, it } from 'vitest';
import { linearScale } from '../scales/linear';
import { lineMark } from './line';
import type { AreaNode, GroupNode, PolylineNode } from '../scene/nodes';

const xScale = linearScale({ domain: [0, 3], range: [0, 300] });
const yScale = linearScale({ domain: [0, 10], range: [100, 0] });
const data = [
  { x: 0, y: 0 },
  { x: 1, y: 5 },
  { x: 2, y: 10 },
];

describe('lineMark', () => {
  it('maps data through scales into a polyline', () => {
    const node = lineMark({ data, x: (d) => d.x, y: (d) => d.y, xScale, yScale }) as PolylineNode;
    expect(node.type).toBe('polyline');
    expect(node.points).toEqual([
      { x: 0, y: 100 },
      { x: 100, y: 50 },
      { x: 200, y: 0 },
    ]);
  });

  it('emits a group with an area fill when area is enabled', () => {
    const node = lineMark({
      data,
      x: (d) => d.x,
      y: (d) => d.y,
      xScale,
      yScale,
      area: true,
    }) as GroupNode;
    expect(node.type).toBe('group');
    expect(node.children).toHaveLength(2);

    const area = node.children[0] as AreaNode;
    const line = node.children[1] as PolylineNode;
    expect(area.type).toBe('area');
    expect(area.baseline).toBe(yScale(0));
    // The area shares the line's exact points (no baseline-cap vertices), which
    // is what keeps the two coupled when a transition morphs them.
    expect(area.points).toEqual(line.points);
  });
});
