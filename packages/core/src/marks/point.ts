import { circle, group, type SceneNode } from '../scene/nodes';
import type { Scale } from '../scales/types';

export interface PointMarkOptions<D, X extends string | number = number> {
  data: readonly D[];
  x: (datum: D, index: number) => X;
  y: (datum: D, index: number) => number;
  xScale: Scale<X>;
  yScale: Scale<number>;
  radius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  key?: string;
}

/** Scatter/dot mark: one circle per datum, in plot-local coordinates. */
export function pointMark<D, X extends string | number = number>(
  options: PointMarkOptions<D, X>,
): SceneNode {
  const { data, x, y, xScale, yScale } = options;
  const radius = options.radius ?? 3;
  const fill = options.fill ?? '#4f46e5';
  const halfBand = xScale.bandwidth() / 2;

  const dots = data.map((d, i) =>
    circle({
      cx: xScale(x(d, i)) + halfBand,
      cy: yScale(y(d, i)),
      r: radius,
      fill,
      stroke: options.stroke,
      strokeWidth: options.strokeWidth,
      key: options.key ? `${options.key}:${i}` : undefined,
    }),
  );

  return group(dots, { key: options.key });
}
