import { describe, expect, it } from 'vitest';
import { annotationMark, referenceBandMark, referenceLineMark } from './reference';
import type { CircleNode, GroupNode, LineNode, RectNode, TextNode } from '../scene/nodes';

const kids = (n: ReturnType<typeof referenceLineMark>) => (n as GroupNode).children;

describe('referenceLineMark', () => {
  it('draws a dashed line at the given endpoints', () => {
    const node = kids(referenceLineMark({ x1: 0, y1: 50, x2: 200, y2: 50 }));
    const lineNode = node.find((c): c is LineNode => c.type === 'line')!;
    expect(lineNode).toMatchObject({ x1: 0, y1: 50, x2: 200, y2: 50 });
    expect(lineNode.strokeDash).toEqual([4, 4]);
    expect(node.some((c) => c.type === 'text')).toBe(false);
  });

  it('adds a label when given', () => {
    const node = kids(
      referenceLineMark({
        x1: 0,
        y1: 50,
        x2: 200,
        y2: 50,
        label: { text: 'target', x: 196, y: 46, align: 'right', baseline: 'bottom' },
      }),
    );
    const labelNode = node.find((c): c is TextNode => c.type === 'text')!;
    expect(labelNode.text).toBe('target');
    expect(labelNode.textAlign).toBe('right');
  });
});

describe('referenceBandMark', () => {
  it('draws a translucent rect over the band', () => {
    const node = kids(referenceBandMark({ x: 0, y: 20, width: 200, height: 40 }));
    const band = node.find((c): c is RectNode => c.type === 'rect')!;
    expect(band).toMatchObject({ x: 0, y: 20, width: 200, height: 40 });
    expect(band.opacity).toBeLessThan(1);
  });
});

describe('annotationMark', () => {
  it('draws a marker, a connector to the offset, and a label', () => {
    const node = kids(
      annotationMark({ x: 100, y: 80, dx: 8, dy: -20, label: { text: 'peak', x: 110, y: 60 } }),
    );
    const leader = node.find((c): c is LineNode => c.type === 'line')!;
    expect(leader).toMatchObject({ x1: 100, y1: 80, x2: 108, y2: 60 });
    const marker = node.find((c): c is CircleNode => c.type === 'circle')!;
    expect(marker).toMatchObject({ cx: 100, cy: 80 });
    expect(node.find((c): c is TextNode => c.type === 'text')!.text).toBe('peak');
  });

  it('omits the marker when radius is 0', () => {
    const node = kids(
      annotationMark({ x: 0, y: 0, dx: 5, dy: 5, radius: 0, label: { text: 'x', x: 5, y: 5 } }),
    );
    expect(node.some((c) => c.type === 'circle')).toBe(false);
  });
});
