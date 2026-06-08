import { describe, expect, it } from 'vitest';
import { pieMark } from './pie';
import type { ArcNode, GroupNode } from '../scene/nodes';

const data = [
  { name: 'a', v: 3 },
  { name: 'b', v: 1 },
];

describe('pieMark', () => {
  it('emits one arc per datum, filled from the palette', () => {
    const node = pieMark({
      data,
      value: (d) => d.v,
      cx: 50,
      cy: 50,
      outerRadius: 40,
    }) as GroupNode;
    const arcs = node.children.filter((c): c is ArcNode => c.type === 'arc');
    expect(arcs).toHaveLength(2);
    expect(arcs[0]!.fill).not.toBe(arcs[1]!.fill);
    expect(arcs[0]!.outerRadius).toBe(40);
  });

  it('uses a stable id for slice keys so they can tween', () => {
    const node = pieMark({
      data,
      value: (d) => d.v,
      cx: 0,
      cy: 0,
      outerRadius: 10,
      id: (d) => d.name,
    }) as GroupNode;
    expect(node.children.map((c) => c.key)).toEqual(['a', 'b']);
  });

  it('adds centroid labels when a label accessor is given', () => {
    const node = pieMark({
      data,
      value: (d) => d.v,
      cx: 0,
      cy: 0,
      outerRadius: 10,
      label: (d) => d.name,
    }) as GroupNode;
    const texts = node.children.filter((c) => c.type === 'text');
    expect(texts).toHaveLength(2);
  });

  it('carries innerRadius through for donuts', () => {
    const node = pieMark({
      data,
      value: (d) => d.v,
      cx: 0,
      cy: 0,
      outerRadius: 10,
      innerRadius: 5,
    }) as GroupNode;
    const arc = node.children.find((c): c is ArcNode => c.type === 'arc')!;
    expect(arc.innerRadius).toBe(5);
  });
});
