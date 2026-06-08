import { describe, expect, it } from 'vitest';
import { bandScale } from '../scales/band';
import { linearScale } from '../scales/linear';
import { barMark } from './bar';
import { groupedBarMark, stackedBarMark } from './bar-series';
import type { GroupNode, RectNode } from '../scene/nodes';

interface Row {
  label: string;
  a: number;
  b: number;
}

const data: Row[] = [
  { label: 'q1', a: 4, b: 2 },
  { label: 'q2', a: 6, b: 3 },
];

const catScale = bandScale<string>({ domain: ['q1', 'q2'], range: [0, 200] });
const valScale = linearScale({ domain: [0, 10], range: [100, 0] });

function rects(node: GroupNode): RectNode[] {
  const out: RectNode[] = [];
  const walk = (n: GroupNode) => {
    for (const child of n.children) {
      if (child.type === 'rect') out.push(child);
      else if (child.type === 'group') walk(child);
    }
  };
  walk(node);
  return out;
}

describe('barMark (vertical)', () => {
  it('draws one bar per datum, sized to the band and value', () => {
    const node = barMark({
      data,
      category: (d) => d.label,
      value: (d) => d.a,
      categoryScale: catScale,
      valueScale: valScale,
    }) as GroupNode;
    const bars = rects(node);
    expect(bars).toHaveLength(2);
    expect(bars[0]!.width).toBe(catScale.bandwidth());
    // value 4 on a [0,10]->[100,0] scale sits at y=60, growing to baseline y=100.
    expect(bars[0]!.y).toBe(60);
    expect(bars[0]!.height).toBe(40);
  });

  it('grows downward for values below the baseline', () => {
    const signed = linearScale({ domain: [-10, 10], range: [200, 0] });
    const node = barMark({
      data: [{ label: 'q1', a: -5, b: 0 }],
      category: (d) => d.label,
      value: (d) => d.a,
      categoryScale: catScale,
      valueScale: signed,
    }) as GroupNode;
    const [bar] = rects(node);
    // baseline (0) is at y=100; value -5 is at y=150, so the bar sits below it.
    expect(bar!.y).toBe(100);
    expect(bar!.height).toBe(50);
  });

  it('uses an explicit thickness when the category scale has no bandwidth', () => {
    const linearCat = linearScale({ domain: [0, 1], range: [0, 100] });
    const node = barMark({
      data: [{ label: 'q1', a: 4, b: 0 }],
      category: () => 0.5,
      value: (d) => d.a,
      categoryScale: linearCat,
      valueScale: valScale,
      thickness: 20,
    }) as GroupNode;
    const [bar] = rects(node);
    expect(bar!.width).toBe(20);
    // centered on the position: 50 - 10.
    expect(bar!.x).toBe(40);
  });
});

describe('barMark (horizontal)', () => {
  it('transposes: categories on y, values growing along x', () => {
    const yBand = bandScale<string>({ domain: ['q1', 'q2'], range: [0, 200] });
    const xValue = linearScale({ domain: [0, 10], range: [0, 300] });
    const node = barMark({
      data,
      category: (d) => d.label,
      value: (d) => d.a,
      categoryScale: yBand,
      valueScale: xValue,
      orientation: 'horizontal',
    }) as GroupNode;
    const [bar] = rects(node);
    // The band sits on the y axis...
    expect(bar!.y).toBe(yBand('q1'));
    expect(bar!.height).toBe(yBand.bandwidth());
    // ...and the value grows along x from the baseline (0) to value 4 -> 120px.
    expect(bar!.x).toBe(0);
    expect(bar!.width).toBe(120);
  });
});

describe('groupedBarMark', () => {
  const series = [
    { key: 'a', value: (d: Row) => d.a },
    { key: 'b', value: (d: Row) => d.b },
  ];

  it('splits each band into one sub-bar per series', () => {
    const node = groupedBarMark({
      data,
      category: (d) => d.label,
      categoryScale: catScale,
      valueScale: valScale,
      series,
    }) as GroupNode;
    const bars = rects(node);
    expect(bars).toHaveLength(4); // 2 categories x 2 series
    expect(bars[0]!.width).toBeLessThan(catScale.bandwidth());
    expect(bars[0]!.fill).not.toBe(bars[1]!.fill);
  });
});

describe('stackedBarMark', () => {
  it('stacks series so segments sit contiguously within a band', () => {
    const node = stackedBarMark({
      data,
      category: (d) => d.label,
      categoryScale: catScale,
      valueScale: valScale,
      series: [
        { key: 'a', value: (d) => d.a },
        { key: 'b', value: (d) => d.b },
      ],
    }) as GroupNode;
    const bars = rects(node);
    expect(bars).toHaveLength(4);
    expect(bars[0]!.width).toBe(catScale.bandwidth());
    // The second segment's bottom meets the first segment's top.
    const first = bars[0]!;
    const second = bars[1]!;
    expect(second.y + second.height).toBeCloseTo(first.y);
  });
});
