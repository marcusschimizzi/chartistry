import { describe, expect, it } from 'vitest';
import { pieMark } from './pie';
import type { ArcNode, GroupNode, TextNode } from '../scene/nodes';

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
      outerRadius: 100,
      label: (d) => d.name,
    }) as GroupNode;
    const texts = node.children.filter((c) => c.type === 'text');
    expect(texts).toHaveLength(2);
  });

  it('suppresses labels on slices too thin to hold them', () => {
    // The second slice is ~0.06 rad — below the adaptive minimum at this radius.
    const tiny = [
      { name: 'big', v: 100 },
      { name: 'sliver', v: 1 },
    ];
    const node = pieMark({
      data: tiny,
      value: (d) => d.v,
      cx: 0,
      cy: 0,
      outerRadius: 100,
      label: (d) => d.name,
    }) as GroupNode;
    const texts = node.children.filter((c): c is TextNode => c.type === 'text');
    expect(texts).toHaveLength(1);
    expect(texts[0]!.text).toBe('big');
  });

  it('respects an explicit minLabelAngle', () => {
    const node = pieMark({
      data,
      value: (d) => d.v,
      cx: 0,
      cy: 0,
      outerRadius: 100,
      label: (d) => d.name,
      // The smaller slice spans ~1.57 rad; raise the bar above it.
      minLabelAngle: 2,
    }) as GroupNode;
    const texts = node.children.filter((c): c is TextNode => c.type === 'text');
    expect(texts).toHaveLength(1);
    expect(texts[0]!.text).toBe('a');
  });

  it('places outside labels with leader lines, anchored by side', () => {
    const node = pieMark({
      data,
      value: (d) => d.v,
      cx: 0,
      cy: 0,
      outerRadius: 100,
      label: (d) => d.name,
      labelPlacement: 'outside',
    }) as GroupNode;

    // A leader line per labeled slice, drawn from the arc edge outward.
    const leaders = node.children.filter((c) => c.type === 'line');
    expect(leaders).toHaveLength(2);

    const texts = node.children.filter((c): c is TextNode => c.type === 'text');
    expect(texts).toHaveLength(2);
    // Outside labels hang off the side the slice faces, never center-anchored.
    expect(texts.every((t) => t.textAlign === 'left' || t.textAlign === 'right')).toBe(true);
    // ...and they sit beyond the arc, not on it.
    expect(texts.some((t) => Math.hypot(t.x, t.y) > 100)).toBe(true);
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
