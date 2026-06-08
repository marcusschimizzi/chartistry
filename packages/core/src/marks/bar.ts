import { group, rect, type RectNode, type SceneNode } from '../scene/nodes';
import type { Scale, ScaleValue } from '../scales/types';

export type BarOrientation = 'vertical' | 'horizontal';

export interface BarMarkOptions<D, C extends ScaleValue = string> {
  data: readonly D[];
  /** Map a datum to its category (the band axis). */
  category: (datum: D, index: number) => C;
  /** Map a datum to its value (the linear axis). */
  value: (datum: D, index: number) => number;
  /** Band scale over the categories. */
  categoryScale: Scale<C>;
  /** Linear scale over the values. */
  valueScale: Scale<number>;
  /** `vertical` (default) puts categories on x; `horizontal` puts them on y. */
  orientation?: BarOrientation;
  /** Value the bars grow from. Defaults to 0. */
  baseline?: number;
  fill?: string;
  /** Bar thickness when `categoryScale` has no bandwidth. */
  thickness?: number;
  /** Corner radius. */
  radius?: number;
  key?: string;
}

/**
 * Single-series bars. Each bar spans from the baseline to its value along the
 * value axis, and occupies its band along the category axis — so flipping
 * `orientation` between `vertical` and `horizontal` is just a transpose of which
 * axis carries the value.
 */
export function barMark<D, C extends ScaleValue = string>(
  options: BarMarkOptions<D, C>,
): SceneNode {
  const { data, category, value, categoryScale, valueScale } = options;
  const horizontal = options.orientation === 'horizontal';
  const fill = options.fill ?? '#6366f1';
  const band = categoryScale.bandwidth();
  const v0 = valueScale(options.baseline ?? 0);

  const bars = data.map((datum, i) => {
    const thickness = band > 0 ? band : (options.thickness ?? 8);
    const catStart =
      band > 0
        ? categoryScale(category(datum, i))
        : categoryScale(category(datum, i)) - thickness / 2;
    const v1 = valueScale(value(datum, i));
    return barRect(catStart, thickness, v0, v1, horizontal, {
      fill,
      rx: options.radius,
      key: options.key ? `${options.key}:${i}` : undefined,
    });
  });

  return group(bars, { key: options.key ?? 'bars' });
}

/**
 * Build a bar rectangle given its band position/thickness on the category axis
 * and its span on the value axis, oriented vertically or horizontally.
 */
export function barRect(
  categoryStart: number,
  thickness: number,
  valueA: number,
  valueB: number,
  horizontal: boolean,
  style: Omit<RectNode, 'type' | 'x' | 'y' | 'width' | 'height'>,
): RectNode {
  const lo = Math.min(valueA, valueB);
  const length = Math.abs(valueB - valueA);
  return horizontal
    ? rect({ x: lo, y: categoryStart, width: length, height: thickness, ...style })
    : rect({ x: categoryStart, y: lo, width: thickness, height: length, ...style });
}
