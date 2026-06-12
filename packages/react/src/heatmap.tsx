import { useMemo } from 'react';
import {
  bandScale,
  blues,
  extent,
  group,
  heatmapMark,
  sequentialScale,
  text,
} from '@chartistry/core';
import { useChartContext, type XValue } from './context';
import { useMark } from './use-mark';

const defaultFormat = (value: number): string => String(value);

export interface HeatmapProps {
  /** Row (y) category accessor. The x categories come from the chart's `x`. */
  y: (datum: unknown, index: number) => XValue;
  /** Cell value accessor — drives the color. */
  value: (datum: unknown, index: number) => number;
  /** Sequential color stops (light→dark). Defaults to a blue ramp. */
  colors?: readonly string[];
  /** Override the color domain; defaults to the value extent. */
  colorDomain?: [number, number];
  /** Gap between cells, in pixels. */
  padding?: number;
  radius?: number;
  /** Draw each cell's value. */
  showValues?: boolean;
  format?: (value: number) => string;
  /** Draw row labels in the left margin. Default true. */
  rowLabels?: boolean;
  /** Override the auto-contrast value-label color. */
  labelColor?: string;
}

/**
 * A heatmap: a grid of colored cells over two category axes. Use it inside a
 * `<Chart xScaleType="band">` (which supplies the x categories and plot) and
 * pass `y` for the rows and `value` for the color. It builds its own row band
 * scale and sequential color scale, and draws row labels in the left margin.
 */
export function Heatmap(props: HeatmapProps): null {
  const { data, categoryScale, plot, xAccessor } = useChartContext();
  const {
    y,
    value,
    colors = blues,
    colorDomain,
    padding,
    radius,
    showValues,
    format = defaultFormat,
    rowLabels = true,
    labelColor,
  } = props;

  const node = useMemo(() => {
    // Distinct row categories, in first-seen order (top to bottom).
    const rows: XValue[] = [];
    const seen = new Set<string | number>();
    data.forEach((d, i) => {
      const row = y(d, i);
      const key = row instanceof Date ? row.getTime() : row;
      if (!seen.has(key)) {
        seen.add(key);
        rows.push(row);
      }
    });
    const yScale = bandScale<XValue>({ domain: rows, range: [0, plot.height], paddingInner: 0 });

    const values = data.map((d, i) => value(d, i));
    const color = sequentialScale({ domain: colorDomain ?? extent(values), range: colors });
    const cells = data.map((d, i) => ({ x: xAccessor(d, i), y: y(d, i), value: values[i]! }));

    const cellsNode = heatmapMark({
      cells,
      xScale: categoryScale,
      yScale,
      color,
      padding,
      radius,
      label: showValues ? format : undefined,
      labelColor,
    });

    if (!rowLabels) return cellsNode;
    const labels = rows.map((cat, i) =>
      text(String(cat), {
        x: -8,
        y: yScale(cat) + yScale.bandwidth() / 2,
        textAlign: 'right',
        textBaseline: 'middle',
        fill: '#475569',
        fontSize: 11,
        key: `row:${i}`,
      }),
    );
    return group([cellsNode, group(labels, { key: 'row-labels' })], {
      key: 'heatmap',
      animate: false,
    });
  }, [
    data,
    categoryScale,
    plot.height,
    xAccessor,
    y,
    value,
    colors,
    colorDomain,
    padding,
    radius,
    showValues,
    format,
    rowLabels,
    labelColor,
  ]);

  useMark(node);
  return null;
}
