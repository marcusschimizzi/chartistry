import { describe, expect, it } from 'vitest';
import { heatmapMark } from './heatmap';
import { bandScale } from '../scales/band';
import { sequentialScale } from '../scales/sequential';
import type { GroupNode, RectNode, TextNode } from '../scene/nodes';

const xScale = bandScale<string>({ domain: ['A', 'B'], range: [0, 100], paddingInner: 0 });
const yScale = bandScale<string>({ domain: ['x', 'y'], range: [0, 100], paddingInner: 0 });
const color = sequentialScale({ domain: [0, 10], range: ['#000000', '#ffffff'] });
const cells = [
  { x: 'A', y: 'x', value: 0 },
  { x: 'B', y: 'y', value: 10 },
];

const kids = (n: ReturnType<typeof heatmapMark>) => (n as GroupNode).children;

describe('heatmapMark', () => {
  it('draws one rect per cell, colored by value and sized to the bands', () => {
    const rects = kids(heatmapMark({ cells, xScale, yScale, color, padding: 0 })).filter(
      (c): c is RectNode => c.type === 'rect',
    );
    expect(rects).toHaveLength(2);
    expect(rects[0]).toMatchObject({ x: 0, y: 0, width: 50, height: 50, fill: '#000000' });
    expect(rects[1]).toMatchObject({ x: 50, y: 50, fill: '#ffffff' });
  });

  it('labels cells with an auto-contrasting color', () => {
    const texts = kids(
      heatmapMark({ cells, xScale, yScale, color, padding: 0, label: (v) => String(v) }),
    ).filter((c): c is TextNode => c.type === 'text');
    expect(texts.map((t) => t.text)).toEqual(['0', '10']);
    expect(texts[0]!.fill).toBe('#ffffff'); // black cell → white label
    expect(texts[1]!.fill).toBe('#1f2937'); // white cell → dark label
  });
});
