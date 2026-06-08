import { group, line, type SceneNode } from '../scene/nodes';
import type { Scale, ScaleValue } from '../scales/types';

export interface GridOptions<T extends ScaleValue> {
  scale: Scale<T>;
  /** 'x' draws vertical lines at x ticks; 'y' draws horizontal lines. */
  axis: 'x' | 'y';
  /** Extent of each gridline across the opposite dimension (the plot size). */
  length: number;
  tickCount?: number;
  color?: string;
  strokeWidth?: number;
  strokeDash?: number[];
  key?: string;
}

/** Background gridlines aligned to a scale's ticks, in plot-local coordinates. */
export function gridMark<T extends ScaleValue>(options: GridOptions<T>): SceneNode {
  const { scale, axis, length } = options;
  const color = options.color ?? '#e2e8f0';
  const strokeWidth = options.strokeWidth ?? 1;
  const halfBand = scale.bandwidth() / 2;
  const values = scale.ticks(options.tickCount);

  const lines = values.map((value) => {
    const pos = scale(value) + halfBand;
    return axis === 'x'
      ? line({
          x1: pos,
          y1: 0,
          x2: pos,
          y2: length,
          stroke: color,
          strokeWidth,
          strokeDash: options.strokeDash,
        })
      : line({
          x1: 0,
          y1: pos,
          x2: length,
          y2: pos,
          stroke: color,
          strokeWidth,
          strokeDash: options.strokeDash,
        });
  });

  return group(lines, { key: options.key ?? `grid:${axis}` });
}
