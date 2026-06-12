import { group, polyline, type SceneNode } from '../scene/nodes';
import { stackedAreaLayout, type AreaOffset } from '../data/stacked-area';
import type { StackSeries } from '../data/stack';
import type { Scale, ScaleValue } from '../scales/types';
import type { Point } from '../types';

export interface StackedAreaSeriesSpec<D> extends StackSeries<D> {
  color?: string;
}

export interface StackedAreaMarkOptions<D, X extends ScaleValue = number> {
  data: readonly D[];
  x: (datum: D, index: number) => X;
  series: readonly StackedAreaSeriesSpec<D>[];
  xScale: Scale<X>;
  yScale: Scale<number>;
  /** `zero` for a stacked area, `silhouette` for a streamgraph. */
  offset?: AreaOffset;
  /** Fill opacity, 0–1. */
  fillOpacity?: number;
  /** Stroke width for each layer's outline; 0/undefined to omit. */
  strokeWidth?: number;
  key?: string;
}

const DEFAULT_FILL = '#4f46e5';

/**
 * Stacked area / streamgraph: one filled band per series, between its lower and
 * upper stacked bounds. Each band is a closed polygon (the upper boundary, then
 * the lower boundary reversed), so it paints on both SVG and Canvas backends.
 */
export function stackedAreaMark<D, X extends ScaleValue = number>(
  options: StackedAreaMarkOptions<D, X>,
): SceneNode {
  const { data, x, series, xScale, yScale } = options;
  const rows = stackedAreaLayout(data, series, options.offset ?? 'zero');
  const half = xScale.bandwidth() / 2;
  const xs = data.map((d, i) => xScale(x(d, i)) + half);

  const layers = series.map((s, si) => {
    const upper: Point[] = data.map((_, i) => ({ x: xs[i]!, y: yScale(rows[i]![si]!.y1) }));
    const lower: Point[] = data.map((_, i) => ({ x: xs[i]!, y: yScale(rows[i]![si]!.y0) }));
    const ring: Point[] = [...upper, ...lower.reverse()];
    return polyline(ring, {
      closed: true,
      fill: s.color ?? DEFAULT_FILL,
      opacity: options.fillOpacity,
      stroke: options.strokeWidth ? (s.color ?? DEFAULT_FILL) : undefined,
      strokeWidth: options.strokeWidth,
      key: `area:${s.key}`,
    });
  });

  return group(layers, { key: options.key });
}
