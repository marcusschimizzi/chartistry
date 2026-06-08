import { group, rect, type SceneNode } from '../scene/nodes';
import { bandScale } from '../scales/band';
import { categoricalColors } from '../scales/ordinal';
import type { Scale, ScaleValue } from '../scales/types';
import { stack, type StackSeries } from '../data/stack';

/** One value series within a multi-series bar mark. */
export interface BarSeries<D> {
  key: string;
  value: (datum: D, index: number) => number;
  /** Explicit color; otherwise drawn from the palette by position. */
  color?: string;
}

export interface MultiBarOptions<D, X extends ScaleValue = string> {
  data: readonly D[];
  x: (datum: D, index: number) => X;
  /** A band scale over the categories. */
  xScale: Scale<X>;
  yScale: Scale<number>;
  series: ReadonlyArray<BarSeries<D>>;
  baseline?: number;
  radius?: number;
  /** Palette used when a series has no explicit color. */
  colors?: readonly string[];
  key?: string;
}

/** Grouped bars: each category's band is split into one sub-bar per series. */
export function groupedBarMark<D, X extends ScaleValue = string>(
  options: MultiBarOptions<D, X> & { groupPadding?: number },
): SceneNode {
  const { data, x, xScale, yScale, series } = options;
  const palette = options.colors ?? categoricalColors;
  const baselineY = yScale(options.baseline ?? 0);
  const bandwidth = xScale.bandwidth();

  // A nested band scale positions each series within a category's bandwidth.
  const inner = bandScale({
    domain: series.map((s) => s.key),
    range: [0, bandwidth],
    paddingInner: options.groupPadding ?? 0.1,
  });
  const innerWidth = inner.bandwidth();

  const groups = data.map((datum, i) => {
    const left = xScale(x(datum, i));
    const bars = series.map((s, sIndex) => {
      const valueY = yScale(s.value(datum, i));
      return rect({
        x: left + inner(s.key),
        y: Math.min(valueY, baselineY),
        width: innerWidth,
        height: Math.abs(baselineY - valueY),
        fill: s.color ?? palette[sIndex % palette.length],
        rx: options.radius,
        key: `${s.key}:${i}`,
      });
    });
    return group(bars, { key: `group:${i}` });
  });

  return group(groups, { key: options.key ?? 'grouped-bars' });
}

/** Stacked bars: series accumulate on top of one another within each category. */
export function stackedBarMark<D, X extends ScaleValue = string>(
  options: MultiBarOptions<D, X>,
): SceneNode {
  const { data, x, xScale, yScale, series } = options;
  const palette = options.colors ?? categoricalColors;
  const bandwidth = xScale.bandwidth();
  const colorByKey = new Map(series.map((s, i) => [s.key, s.color ?? palette[i % palette.length]]));

  const stacked = stack(data, series as ReadonlyArray<StackSeries<D>>);

  const columns = data.map((datum, i) => {
    const left = xScale(x(datum, i));
    const segments = stacked[i] ?? [];
    const rects = segments.map((segment) => {
      const top = yScale(segment.y1);
      const bottom = yScale(segment.y0);
      return rect({
        x: left,
        y: Math.min(top, bottom),
        width: bandwidth,
        height: Math.abs(bottom - top),
        fill: colorByKey.get(segment.key),
        rx: options.radius,
        key: `${segment.key}:${i}`,
      });
    });
    return group(rects, { key: `stack:${i}` });
  });

  return group(columns, { key: options.key ?? 'stacked-bars' });
}
