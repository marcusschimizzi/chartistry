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
  /** Row (y) category accessor. The columns come from the chart's `x`. */
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
  /** Draw column labels under the plot. Default true. */
  columnLabels?: boolean;
  /** Override the auto-contrast value-label color. */
  labelColor?: string;
}

/**
 * A heatmap: a grid of colored cells over two category axes. It's self-contained
 * — it reads the chart's `x` accessor and plot, builds its own column and row
 * band scales (uniform cells, independent of `bandPadding`/`orientation`), and
 * draws both axes' labels. Use it inside a `<Chart>` and don't add `<XAxis>`.
 */
export function Heatmap(props: HeatmapProps): null {
  const { data, plot, xAccessor } = useChartContext();
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
    columnLabels = true,
    labelColor,
  } = props;

  const node = useMemo(() => {
    const cols = distinct(data.map((d, i) => xAccessor(d, i)));
    const rows = distinct(data.map((d, i) => y(d, i)));
    // Both axes use paddingInner 0, so cells are uniform; the `padding` prop adds
    // an even gap between them. Plot dimensions are used directly, so the grid is
    // unaffected by the chart's bandPadding or orientation.
    const xScale = bandScale<XValue>({ domain: cols, range: [0, plot.width], paddingInner: 0 });
    const yScale = bandScale<XValue>({ domain: rows, range: [0, plot.height], paddingInner: 0 });

    const values = data.map((d, i) => value(d, i));
    const color = sequentialScale({ domain: colorDomain ?? extent(values), range: colors });
    const cells = data.map((d, i) => ({ x: xAccessor(d, i), y: y(d, i), value: values[i]! }));

    const cellsNode = heatmapMark({
      cells,
      xScale,
      yScale,
      color,
      padding,
      radius,
      label: showValues ? format : undefined,
      labelColor,
    });

    const labels: SceneNode[] = [];
    if (rowLabels) {
      for (const cat of rows) {
        labels.push(
          text(String(cat), {
            x: -8,
            y: yScale(cat) + yScale.bandwidth() / 2,
            textAlign: 'right',
            textBaseline: 'middle',
            fill: '#475569',
            fontSize: 11,
            key: `row:${String(cat)}`,
          }),
        );
      }
    }
    if (columnLabels) {
      for (const cat of cols) {
        labels.push(
          text(String(cat), {
            x: xScale(cat) + xScale.bandwidth() / 2,
            y: plot.height + 16,
            textAlign: 'center',
            textBaseline: 'middle',
            fill: '#475569',
            fontSize: 11,
            key: `col:${String(cat)}`,
          }),
        );
      }
    }

    if (labels.length === 0) return cellsNode;
    return group([cellsNode, group(labels, { key: 'labels' })], { key: 'heatmap', animate: false });
  }, [
    data,
    plot.width,
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
    columnLabels,
    labelColor,
  ]);

  useMark(node);
  return null;
}
