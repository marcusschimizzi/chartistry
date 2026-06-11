import { circle, group, type SceneNode } from '../scene/nodes';
import type { Scale, ScaleValue } from '../scales/types';

/** A constant, or a per-datum accessor — lets one mark do dots and bubbles. */
type PerDatum<D, T> = T | ((datum: D, index: number) => T);

export interface PointMarkOptions<D, X extends ScaleValue = number> {
  data: readonly D[];
  x: (datum: D, index: number) => X;
  y: (datum: D, index: number) => number;
  xScale: Scale<X>;
  yScale: Scale<number>;
  /** Circle radius — a constant, or per datum (for value-encoded bubbles). */
  radius?: PerDatum<D, number>;
  /** Fill color — a constant, or per datum (for color-encoded bubbles). */
  fill?: PerDatum<D, string>;
  stroke?: string;
  strokeWidth?: number;
  /** Whole-circle opacity, 0–1. Useful when bubbles overlap. */
  opacity?: number;
  key?: string;
}

function at<D, T>(value: PerDatum<D, T> | undefined, fallback: T, d: D, i: number): T {
  if (typeof value === 'function') return (value as (datum: D, index: number) => T)(d, i);
  return value ?? fallback;
}

/** Scatter/dot/bubble mark: one circle per datum, in plot-local coordinates. */
export function pointMark<D, X extends ScaleValue = number>(
  options: PointMarkOptions<D, X>,
): SceneNode {
  const { data, x, y, xScale, yScale } = options;
  const halfBand = xScale.bandwidth() / 2;

  const dots = data.map((d, i) =>
    circle({
      cx: xScale(x(d, i)) + halfBand,
      cy: yScale(y(d, i)),
      r: at(options.radius, 3, d, i),
      fill: at(options.fill, '#4f46e5', d, i),
      stroke: options.stroke,
      strokeWidth: options.strokeWidth,
      opacity: options.opacity,
      key: options.key ? `${options.key}:${i}` : undefined,
    }),
  );

  return group(dots, { key: options.key });
}
