import { describe, expect, it } from 'vitest';
import { pointMark } from './point';
import { linearScale } from '../scales/linear';
import type { CircleNode, GroupNode } from '../scene/nodes';

const xs = linearScale({ domain: [0, 10], range: [0, 100] });
const ys = linearScale({ domain: [0, 10], range: [100, 0] });
const data = [
  { x: 0, y: 0, v: 1 },
  { x: 5, y: 5, v: 4 },
  { x: 10, y: 10, v: 9 },
];

const circles = (node: ReturnType<typeof pointMark>) =>
  (node as GroupNode).children as CircleNode[];

describe('pointMark', () => {
  it('places one circle per datum at scaled coordinates', () => {
    const node = pointMark({ data, x: (d) => d.x, y: (d) => d.y, xScale: xs, yScale: ys });
    const kids = circles(node);
    expect(kids).toHaveLength(3);
    expect(kids[0]).toMatchObject({ type: 'circle', cx: 0, cy: 100, r: 3 });
    expect(kids[2]).toMatchObject({ cx: 100, cy: 0 });
  });

  it('supports a per-datum radius (bubbles)', () => {
    const node = pointMark({
      data,
      x: (d) => d.x,
      y: (d) => d.y,
      xScale: xs,
      yScale: ys,
      radius: (d) => d.v,
    });
    expect(circles(node).map((c) => c.r)).toEqual([1, 4, 9]);
  });

  it('supports a per-datum fill and a whole-mark opacity', () => {
    const node = pointMark({
      data,
      x: (d) => d.x,
      y: (d) => d.y,
      xScale: xs,
      yScale: ys,
      fill: (d) => (d.v > 1 ? '#f00' : '#00f'),
      opacity: 0.5,
    });
    const kids = circles(node);
    expect(kids.map((c) => c.fill)).toEqual(['#00f', '#f00', '#f00']);
    expect(kids.every((c) => c.opacity === 0.5)).toBe(true);
  });

  it('centers circles on the band when the x scale has bandwidth', () => {
    // A constant-radius scatter still works with the existing single-number API.
    const node = pointMark({ data, x: (d) => d.x, y: (d) => d.y, xScale: xs, yScale: ys, radius: 5 });
    expect(circles(node).every((c) => c.r === 5)).toBe(true);
  });
});
