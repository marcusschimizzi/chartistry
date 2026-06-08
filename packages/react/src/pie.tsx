import { useMemo } from 'react';
import { pieMark } from '@chartistry/core';
import { useChartContext } from './context';
import { useMark } from './use-mark';

export interface PieProps {
  /** Slice value. Defaults to the chart's y accessor. */
  value?: (datum: unknown, index: number) => number;
  /** Inner radius as a fraction of the outer radius (0–1). > 0 makes a donut. */
  innerRadius?: number;
  /** Gap between slices, in radians. */
  padAngle?: number;
  /** Palette for slices. */
  colors?: readonly string[];
  /** Padding between the pie and the plot edge, in pixels. */
  padding?: number;
  /** Optional label drawn at each slice centroid. */
  label?: (datum: unknown, index: number) => string;
}

/**
 * A pie or donut, centered in the plot area. It reads the chart's data and (by
 * default) its y accessor for slice values, and keys each slice by the x value
 * so slices tween when the data changes. Add `innerRadius` for a donut.
 */
export function Pie(props: PieProps): null {
  const { data, plot, xAccessor, yAccessor } = useChartContext();
  const value = props.value ?? yAccessor;
  const padding = props.padding ?? 4;

  const outerRadius = Math.max(0, Math.min(plot.width, plot.height) / 2 - padding);
  const innerRadius = (props.innerRadius ?? 0) * outerRadius;

  const node = useMemo(() => {
    // Key slices by category so they tween across data changes — but two rows
    // can share a label, and a duplicate key would let keyed diffing collapse
    // them into one slice. Disambiguate repeats with an occurrence suffix.
    const counts = new Map<string, number>();
    const id = (d: unknown, i: number): string => {
      const label = String(xAccessor(d, i));
      const n = counts.get(label) ?? 0;
      counts.set(label, n + 1);
      return n === 0 ? label : `${label}~${n}`;
    };
    return pieMark({
      data,
      value,
      cx: plot.width / 2,
      cy: plot.height / 2,
      outerRadius,
      innerRadius,
      padAngle: props.padAngle,
      colors: props.colors,
      id,
      label: props.label,
    });
  }, [
    data,
    value,
    plot.width,
    plot.height,
    outerRadius,
    innerRadius,
    props.padAngle,
    props.colors,
    props.label,
    xAccessor,
  ]);

  useMark(node);
  return null;
}
