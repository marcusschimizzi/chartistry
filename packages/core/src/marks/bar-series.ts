import { group, type SceneNode } from '../scene/nodes';
import { bandScale } from '../scales/band';
import { categoricalColors } from '../scales/ordinal';
import type { Scale, ScaleValue } from '../scales/types';
import { stack, type StackSeries } from '../data/stack';
import { barRect, type BarOrientation } from './bar';

/** One value series within a multi-series bar mark. */
export interface BarSeries<D> {
  key: string;
  value: (datum: D, index: number) => number;
  /** Explicit color; otherwise drawn from the palette by position. */
  color?: string;
}

export interface MultiBarOptions<D, C extends ScaleValue = string> {
  data: readonly D[];
  category: (datum: D, index: number) => C;
  /** Band scale over the categories. */
  categoryScale: Scale<C>;
  /** Linear scale over the values. */
  valueScale: Scale<number>;
  series: ReadonlyArray<BarSeries<D>>;
  orientation?: BarOrientation;
  baseline?: number;
  radius?: number;
  /** Palette used when a series has no explicit color. */
  colors?: readonly string[];
  key?: string;
}

/** Grouped bars: each category's band is split into one sub-bar per series. */
export function groupedBarMark<D, C extends ScaleValue = string>(
  options: MultiBarOptions<D, C> & { groupPadding?: number },
): SceneNode {
  const { data, category, categoryScale, valueScale, series } = options;
  const horizontal = options.orientation === 'horizontal';
  const palette = options.colors ?? categoricalColors;
  const v0 = valueScale(options.baseline ?? 0);
  const band = categoryScale.bandwidth();

  // A nested band scale positions each series within a category's bandwidth.
  const inner = bandScale({
    domain: series.map((s) => s.key),
    range: [0, band],
    paddingInner: options.groupPadding ?? 0.1,
  });
  const innerWidth = inner.bandwidth();

  const groups = data.map((datum, i) => {
    const catStart = categoryScale(category(datum, i));
    const bars = series.map((s, sIndex) =>
      barRect(catStart + inner(s.key), innerWidth, v0, valueScale(s.value(datum, i)), horizontal, {
        fill: s.color ?? palette[sIndex % palette.length],
        rx: options.radius,
        key: `${s.key}:${i}`,
      }),
    );
    return group(bars, { key: `group:${i}` });
  });

  return group(groups, { key: options.key ?? 'grouped-bars' });
}

/** Stacked bars: series accumulate on top of one another within each category. */
export function stackedBarMark<D, C extends ScaleValue = string>(
  options: MultiBarOptions<D, C>,
): SceneNode {
  const { data, category, categoryScale, valueScale, series } = options;
  const horizontal = options.orientation === 'horizontal';
  const palette = options.colors ?? categoricalColors;
  const band = categoryScale.bandwidth();
  const colorByKey = new Map(series.map((s, i) => [s.key, s.color ?? palette[i % palette.length]]));

  const stacked = stack(data, series as ReadonlyArray<StackSeries<D>>);

  const columns = data.map((datum, i) => {
    const catStart = categoryScale(category(datum, i));
    const segments = stacked[i] ?? [];
    const rects = segments.map((segment) =>
      barRect(catStart, band, valueScale(segment.y0), valueScale(segment.y1), horizontal, {
        fill: colorByKey.get(segment.key),
        rx: options.radius,
        key: `${segment.key}:${i}`,
      }),
    );
    return group(rects, { key: `stack:${i}` });
  });

  return group(columns, { key: options.key ?? 'stacked-bars' });
}
