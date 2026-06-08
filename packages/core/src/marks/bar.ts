import { group, rect, type SceneNode } from '../scene/nodes';
import type { Scale } from '../scales/types';

export interface BarMarkOptions<D, X extends string | number = string> {
  data: readonly D[];
  /** Map a datum to its category (band scale) or position (linear scale). */
  x: (datum: D, index: number) => X;
  /** Map a datum to its value. */
  y: (datum: D, index: number) => number;
  /** Usually a band scale; a linear scale works if you also pass `width`. */
  xScale: Scale<X>;
  yScale: Scale<number>;
  /** Value the bars grow from. Defaults to 0. */
  baseline?: number;
  fill?: string;
  /** Bar width when `xScale` has no bandwidth (i.e. a linear scale). */
  width?: number;
  /** Corner radius. */
  radius?: number;
  key?: string;
}

/**
 * Vertical bars for a single series. Bars grow from the baseline to each value,
 * so negative values render below the baseline automatically. Width comes from
 * the band scale's `bandwidth()`, or from `width` when an x position scale has
 * no bandwidth.
 */
export function barMark<D, X extends string | number = string>(
  options: BarMarkOptions<D, X>,
): SceneNode {
  const { data, x, y, xScale, yScale } = options;
  const fill = options.fill ?? '#6366f1';
  const baselineY = yScale(options.baseline ?? 0);
  const bandwidth = xScale.bandwidth();

  const bars = data.map((datum, i) => {
    const category = x(datum, i);
    const valueY = yScale(y(datum, i));
    const barWidth = bandwidth > 0 ? bandwidth : (options.width ?? 8);
    const left = bandwidth > 0 ? xScale(category) : xScale(category) - barWidth / 2;

    return rect({
      x: left,
      y: Math.min(valueY, baselineY),
      width: barWidth,
      height: Math.abs(baselineY - valueY),
      fill,
      rx: options.radius,
      key: options.key ? `${options.key}:${i}` : undefined,
    });
  });

  return group(bars, { key: options.key ?? 'bars' });
}
