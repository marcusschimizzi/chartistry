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
    const values = data.map((d, i) => value(d, i));
    const color = sequentialScale({ domain: colorDomain ?? extent(values), range: colors });
    const cells = data.map((d, i) => ({
      x: xAccessor(d, i),
      y: rowAccessor(d, i),
      value: values[i]!,
    }));
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
