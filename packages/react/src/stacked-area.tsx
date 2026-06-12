import { useMemo } from 'react';
import { stackedAreaMark, type StackedAreaSeriesSpec } from '@chartistry/core';
import { useChartContext } from './context';
import { useMark } from './use-mark';

export interface StackedAreaProps {
  /** Override the stacking offset; defaults to the Chart's `stackY` mode. */
  offset?: 'zero' | 'silhouette';
  /** Fill opacity, 0–1. */
  fillOpacity?: number;
  /** Stroke width for each layer's outline. */
  strokeWidth?: number;
}

/**
 * Stacked area (or streamgraph) from the chart's `series`: one filled band per
 * series between its stacked bounds. Set `stackY` (or `stackY="silhouette"`) on
 * the <Chart> so the value axis spans the stack; this reads that offset from
 * context unless `offset` overrides it.
 */
export function StackedArea(props: StackedAreaProps): null {
  const { data, categoryScale, valueScale, xAccessor, series, stackOffset } = useChartContext();
  const offset = props.offset ?? stackOffset;

  const node = useMemo(() => {
    const areaSeries: StackedAreaSeriesSpec<unknown>[] = series.map((s) => ({
      key: s.key,
      value: s.y,
      color: s.color,
    }));
    return stackedAreaMark({
      data,
      x: xAccessor,
      xScale: categoryScale,
      yScale: valueScale,
      series: areaSeries,
      offset,
      fillOpacity: props.fillOpacity,
      strokeWidth: props.strokeWidth,
    });
  }, [data, xAccessor, categoryScale, valueScale, series, offset, props.fillOpacity, props.strokeWidth]);

  useMark(node);
  return null;
}
