import { describe, expect, it } from 'vitest';
import { sizeLegendMark } from './size-legend';
import type { CircleNode, GroupNode, TextNode } from '../scene/nodes';

const group = (n: ReturnType<typeof sizeLegendMark>) => n as GroupNode;
const circles = (n: GroupNode) => n.children.filter((c): c is CircleNode => c.type === 'circle');
const texts = (n: GroupNode) => n.children.filter((c): c is TextNode => c.type === 'text');

describe('sizeLegendMark', () => {
  it('nests circles on a common bottom tangent, largest outermost', () => {
    const node = group(
      sizeLegendMark({
        entries: [
          { radius: 5, label: '5' },
          { radius: 20, label: '100' },
          { radius: 12, label: '40' },
        ],
        x: 0,
        y: 0,
      }),
    );
    const cs = circles(node);
    expect(cs).toHaveLength(3);
    expect(cs[0]!.r).toBe(20); // largest first
    expect(cs[2]!.r).toBe(5);
    // Every circle shares the same bottom edge (cy + r) and center x.
    expect(new Set(cs.map((c) => Math.round(c.cy + c.r))).size).toBe(1);
    expect(new Set(cs.map((c) => c.cx)).size).toBe(1);
  });

  it('labels each entry and renders an optional title', () => {
    const node = group(
      sizeLegendMark({
        entries: [
          { radius: 10, label: 'A' },
          { radius: 4, label: 'B' },
        ],
        x: 0,
        y: 0,
        title: 'Population',
      }),
    );
    const labels = texts(node).map((t) => t.text);
    expect(labels).toContain('Population');
    expect(labels).toEqual(expect.arrayContaining(['A', 'B']));
  });

  it('is inert to transitions', () => {
    const node = sizeLegendMark({ entries: [{ radius: 8, label: 'x' }], x: 0, y: 0 });
    expect(node.animate).toBe(false);
  });
});
