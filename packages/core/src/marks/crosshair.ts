import { group, line, type SceneNode } from '../scene/nodes';

export interface CrosshairOptions {
  /** Vertical guide at this plot-local x. Omit to skip the vertical line. */
  x?: number;
  /** Horizontal guide at this plot-local y. Omit to skip the horizontal line. */
  y?: number;
  /** Plot dimensions, so the guides span the full area. */
  width: number;
  height: number;
  color?: string;
  strokeWidth?: number;
  strokeDash?: number[];
  key?: string;
}

/**
 * Reference guides that track the pointer. Drawing them into the scene graph
 * (rather than as an HTML overlay) keeps them pixel-aligned with the data and
 * consistent across renderers.
 */
export function crosshairMark(options: CrosshairOptions): SceneNode {
  const color = options.color ?? '#94a3b8';
  const strokeWidth = options.strokeWidth ?? 1;
  const strokeDash = options.strokeDash ?? [4, 4];

  const lines: SceneNode[] = [];
  if (options.x !== undefined) {
    lines.push(
      line({
        x1: options.x,
        y1: 0,
        x2: options.x,
        y2: options.height,
        stroke: color,
        strokeWidth,
        strokeDash,
      }),
    );
  }
  if (options.y !== undefined) {
    lines.push(
      line({
        x1: 0,
        y1: options.y,
        x2: options.width,
        y2: options.y,
        stroke: color,
        strokeWidth,
        strokeDash,
      }),
    );
  }

  // Crosshairs follow the pointer, so they should snap, not ease.
  return group(lines, { key: options.key ?? 'crosshair', animate: false });
}
