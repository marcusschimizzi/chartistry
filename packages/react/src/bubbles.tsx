import { useMemo } from 'react';
import {
  categoricalColors,
  colorScale as createColorScale,
  extent,
  pointMark,
  sqrtScale,
} from '@chartistry/core';
import { useChartContext } from './context';
import { useMark } from './use-mark';

export interface BubblesProps {
  /**
   * Value encoded as bubble size. Radius scales with √value, so the bubble's
   * AREA is proportional to the value. Omit for fixed-radius dots (a scatter).
   */
  size?: (datum: unknown, index: number) => number;
  /** Min/max radius in pixels. Defaults to [3, 24]. */
  sizeRange?: [number, number];
  /** Override the size domain; defaults to the data extent of `size`. */
  sizeDomain?: [number, number];
  /** Categorical color accessor, mapped through `colors`. */
  color?: (datum: unknown, index: number) => string | number;
  /** Palette for `color`. Defaults to the built-in categorical palette. */
  colors?: readonly string[];
  /** Constant fill, used when `color` is not set. */
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  /** Whole-bubble opacity, 0–1. Defaults to 0.7 so overlaps stay legible. */
  opacity?: number;
}

/**
 * Bubbles / scatter: one circle per datum over the chart's x/y accessors. Pass
 * `size` to encode a value as area (a bubble chart) and `color` to encode a
 * category as fill; omit both for a plain scatter of dots.
 */
export function Bubbles(props: BubblesProps): null {
  const { data, categoryScale, valueScale, xAccessor, yAccessor } = useChartContext();
  const {
    size,
    sizeRange = [3, 24],
    sizeDomain,
    color,
    colors = categoricalColors,
    fill = '#4f46e5',
    stroke,
    strokeWidth,
    opacity = 0.7,
  } = props;

  const radius = useMemo(() => {
    if (!size) return undefined;
    const domain = sizeDomain ?? extent(data.map((d, i) => size(d, i)));
    const scale = sqrtScale({ domain, range: sizeRange, clamp: true });
    return (d: unknown, i: number) => scale(size(d, i));
  }, [size, data, sizeDomain, sizeRange]);

  const fillOf = useMemo(() => {
    if (!color) return fill;
    const distinct = [...new Set(data.map((d, i) => color(d, i)))];
    const scale = createColorScale(distinct, colors);
    return (d: unknown, i: number) => scale(color(d, i));
  }, [color, data, colors, fill]);

  const node = useMemo(
    () =>
      pointMark({
        data,
        x: xAccessor,
        y: yAccessor,
        xScale: categoryScale,
        yScale: valueScale,
        radius,
        fill: fillOf,
        stroke,
        strokeWidth,
        opacity,
      }),
    [data, xAccessor, yAccessor, categoryScale, valueScale, radius, fillOf, stroke, strokeWidth, opacity],
  );

  useMark(node);
  return null;
}
