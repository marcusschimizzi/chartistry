import { useMemo } from 'react';
import { blues, extent, group, heatmapMark, sequentialScale } from '@chartistry/core';
import { useChartContext } from './context';
import { useMark } from './use-mark';

const defaultFormat = (value: number): string => String(value);

export interface HeatmapProps {
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
  /** Override the auto-contrast value-label color. */
  labelColor?: string;
}

/**
 * A heatmap: a grid of colored cells over two category axes. Configure the grid
 * on the `<Chart>` — `xScaleType="band"` with `x` for columns, `yScaleType="band"`
 * with `yCategory` for rows, and `value` for the cell value — then add
 * `<Heatmap>` for the cells and `<XAxis>`/`<YAxis>` for the labels. Because both
 * axes are the chart's own, the cells align with the axes and with hit-testing.
 */
export function Heatmap(props: HeatmapProps): null {
  const { data, xScale, yScale, xAccessor, rowAccessor, value } = useChartContext();
  const {
    colors = blues,
    colorDomain,
    padding,
    radius,
    showValues,
    format = defaultFormat,
    labelColor,
  } = props;

  const node = useMemo(() => {
    // Needs the grid config from the Chart (yScaleType="band" + yCategory + value).
    if (!rowAccessor || !value) return group([], { key: 'heatmap' });
    // Only cells whose column and row are on the grid (in the band domains) are
    // drawn — a datum outside xDomain/yCategoryDomain has no band position, so
    // it would render at a non-finite spot and skew the auto color range.
    const keyOf = (v: unknown) => (v instanceof Date ? v.getTime() : v);
    const colKeys = new Set(xScale.domain.map(keyOf));
    const rowKeys = new Set(yScale.domain.map(keyOf));
    const cells = data.flatMap((d, i) => {
      const x = xAccessor(d, i);
      const y = rowAccessor(d, i);
      if (!colKeys.has(keyOf(x)) || !rowKeys.has(keyOf(y))) return [];
      return [{ x, y, value: value(d, i) }];
    });
    const color = sequentialScale({
      domain: colorDomain ?? extent(cells.map((c) => c.value)),
      range: colors,
    });
    return heatmapMark({
      cells,
      xScale,
      yScale,
      color,
      padding,
      radius,
      label: showValues ? format : undefined,
      labelColor,
      key: 'heatmap',
    });
  }, [
    data,
    xScale,
    yScale,
    xAccessor,
    rowAccessor,
    value,
    colors,
    colorDomain,
    padding,
    radius,
    showValues,
    format,
    labelColor,
  ]);

  useMark(node);
  return null;
}
