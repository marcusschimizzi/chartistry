import type { SceneNode } from '../scene/nodes';
import type { Point } from '../types';

/**
 * Animating a scene means interpolating numbers. These helpers project a node's
 * animatable fields to a flat number array and back, so the animator can lerp
 * any shape with one code path. The last entry is always opacity, which lets
 * enter/exit fade uniformly across every node type (groups included).
 */

export function flatten(node: SceneNode): number[] {
  switch (node.type) {
    case 'group':
      return [node.x ?? 0, node.y ?? 0, node.opacity ?? 1];
    case 'line':
      return [node.x1, node.y1, node.x2, node.y2, node.strokeWidth ?? 1, node.opacity ?? 1];
    case 'rect':
      return [
        node.x,
        node.y,
        Math.max(0, node.width),
        Math.max(0, node.height),
        node.rx ?? 0,
        node.opacity ?? 1,
      ];
    case 'circle':
      return [node.cx, node.cy, Math.max(0, node.r), node.strokeWidth ?? 1, node.opacity ?? 1];
    case 'text':
      return [node.x, node.y, node.fontSize ?? 11, node.opacity ?? 1];
    case 'polyline':
      return [node.strokeWidth ?? 1, node.opacity ?? 1, ...node.points.flatMap((p) => [p.x, p.y])];
  }
}

/**
 * Rebuild a node from a `base` (carrying static props: colors, text, alignment)
 * and a flattened geometry array. Group children are supplied separately, since
 * the animator composes them from its retained tree.
 */
export function withGeometry(base: SceneNode, a: number[], children?: SceneNode[]): SceneNode {
  switch (base.type) {
    case 'group':
      return {
        ...base,
        x: a[0] ?? 0,
        y: a[1] ?? 0,
        opacity: a[2] ?? 1,
        children: children ?? base.children,
      };
    case 'line':
      return {
        ...base,
        x1: a[0] ?? 0,
        y1: a[1] ?? 0,
        x2: a[2] ?? 0,
        y2: a[3] ?? 0,
        strokeWidth: a[4] ?? 1,
        opacity: a[5] ?? 1,
      };
    case 'rect':
      return {
        ...base,
        x: a[0] ?? 0,
        y: a[1] ?? 0,
        width: a[2] ?? 0,
        height: a[3] ?? 0,
        rx: a[4] ?? 0,
        opacity: a[5] ?? 1,
      };
    case 'circle':
      return {
        ...base,
        cx: a[0] ?? 0,
        cy: a[1] ?? 0,
        r: a[2] ?? 0,
        strokeWidth: a[3] ?? 1,
        opacity: a[4] ?? 1,
      };
    case 'text':
      return { ...base, x: a[0] ?? 0, y: a[1] ?? 0, fontSize: a[2] ?? 11, opacity: a[3] ?? 1 };
    case 'polyline': {
      const points: Point[] = [];
      for (let i = 2; i < a.length; i += 2) points.push({ x: a[i] ?? 0, y: a[i + 1] ?? 0 });
      return { ...base, strokeWidth: a[0] ?? 1, opacity: a[1] ?? 1, points };
    }
  }
}

export function isClosed(node: SceneNode): boolean {
  return node.type === 'polyline' && node.closed === true;
}
