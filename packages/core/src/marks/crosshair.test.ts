import { describe, expect, it } from 'vitest';
import { crosshairMark } from './crosshair';
import type { GroupNode, LineNode } from '../scene/nodes';

describe('crosshairMark', () => {
  it('draws a full-height vertical guide at x', () => {
    const node = crosshairMark({ x: 40, width: 200, height: 100 }) as GroupNode;
    expect(node.children).toHaveLength(1);
    const guide = node.children[0] as LineNode;
    expect(guide).toMatchObject({ x1: 40, x2: 40, y1: 0, y2: 100 });
  });

  it('draws both guides when x and y are given', () => {
    const node = crosshairMark({ x: 40, y: 30, width: 200, height: 100 }) as GroupNode;
    expect(node.children).toHaveLength(2);
    const horizontal = node.children[1] as LineNode;
    expect(horizontal).toMatchObject({ x1: 0, x2: 200, y1: 30, y2: 30 });
  });

  it('draws nothing when neither coordinate is supplied', () => {
    const node = crosshairMark({ width: 200, height: 100 }) as GroupNode;
    expect(node.children).toHaveLength(0);
  });
});
