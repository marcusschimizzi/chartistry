import { useMemo } from 'react';
import {
  bandScale,
  blues,
  extent,
  group,
  heatmapMark,
  sequentialScale,
  text,
  type SceneNode,
} from '@chartistry/core';
import { useChartContext, type XValue } from './context';
import { useMark } from './use-mark';

const defaultFormat = (value: number): string => String(value);

// Distinct values in first-seen order, keyed by primitive (Dates by instant).
function distinct(values: readonly XValue[]): XValue[] {
  const out: XValue[] = [];
  const seen = new Set<string | number>();
  for (const v of values) {
    const key = v instanceof Date ? v.getTime() : v;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(v);
    }
  }
  return out;
}

export interface HeatmapProps {
  /** Row (y) category accessor. Columns come from the chart's `x`. */
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
  /** Draw row labels in the margin. Default true. (Columns use `<XAxis>`.) */
  rowLabels?: boolean;
  /** Override the auto-contrast value-label color. */
  labelColor?: string;
}

/**
 * A heatmap: a grid of colored cells over two category axes. Use it inside a
 * `<Chart xScaleType="band">` — the chart's `x` (and its category scale) supply
 * the columns, so `<XAxis>` labels and hit-testing line up. `<Heatmap>` builds a
 * row band scale matched to the column scale's padding (so cells stay evenly
 * spaced regardless of `bandPadding`), maps `value` through a sequential color
 * scale, and draws the row labels. Honors the chart's `orientation`.
 */
export function Heatmap(props: HeatmapProps): null {
  const { data, categoryScale, plot, xAccessor, orientation } = useChartContext();
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
  const horizontal = orientation === 'horizontal';

  const node = useMemo(() => {
    const rows = distinct(data.map((d, i) => y(d, i)));

    // Match the row band's inner padding to the column (category) scale's, so
    // cells are evenly gapped on both axes regardless of the chart's bandPadding.
    const cols = categoryScale.domain;
    const step =
      cols.length > 1
        ? Math.abs(categoryScale(cols[1]!) - categoryScale(cols[0]!))
        : categoryScale.bandwidth();
    const innerPad = step > 0 ? Math.max(0, Math.min(1, 1 - categoryScale.bandwidth() / step)) : 0;
    const rowScale = bandScale<XValue>({
      domain: rows,
      range: [0, horizontal ? plot.width : plot.height],
      paddingInner: innerPad,
    });

    const values = data.map((d, i) => value(d, i));
    const color = sequentialScale({ domain: colorDomain ?? extent(values), range: colors });
    const cells = data.map((d, i) => ({ x: xAccessor(d, i), y: y(d, i), value: values[i]! }));

    const cellsNode = heatmapMark({
      cells,
      columnScale: categoryScale,
      rowScale,
      horizontal,
      color,
      padding,
      radius,
      label: showValues ? format : undefined,
      labelColor,
    });

    if (!rowLabels) return cellsNode;
    const labels: SceneNode[] = rows.map((cat) => {
      const mid = rowScale(cat) + rowScale.bandwidth() / 2;
      // Vertical: rows run down the y axis → labels on the left. Horizontal:
      // rows run across x → labels under the plot.
      return horizontal
        ? text(String(cat), {
            x: mid,
            y: plot.height + 16,
            textAlign: 'center',
            textBaseline: 'middle',
            fill: '#475569',
            fontSize: 11,
            key: `row:${String(cat)}`,
          })
        : text(String(cat), {
            x: -8,
            y: mid,
            textAlign: 'right',
            textBaseline: 'middle',
            fill: '#475569',
            fontSize: 11,
            key: `row:${String(cat)}`,
          });
    });
    return group([cellsNode, group(labels, { key: 'row-labels' })], {
      key: 'heatmap',
      animate: false,
    });
  }, [
    data,
    categoryScale,
    plot.width,
    plot.height,
    xAccessor,
    horizontal,
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
