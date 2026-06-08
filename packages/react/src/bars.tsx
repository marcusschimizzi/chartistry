import { useMemo } from 'react';
import { barMark, groupedBarMark, stackedBarMark, type BarSeries } from '@chartistry/core';
import { useChartContext } from './context';
import { useMark } from './use-mark';

export interface BarsProps {
  fill?: string;
  baseline?: number;
  radius?: number;
  /** Bar width when the chart uses a linear (non-band) x scale. */
  width?: number;
}

/**
 * Single-series vertical bars over the chart's data. Use with
 * `xScaleType="band"` on <Chart> for a categorical axis.
 */
export function Bars(props: BarsProps): null {
  const { data, xScale, yScale, xAccessor, yAccessor } = useChartContext();

  const node = useMemo(
    () =>
      barMark({
        data,
        x: xAccessor,
        y: yAccessor,
        xScale,
        yScale,
        fill: props.fill,
        baseline: props.baseline,
        radius: props.radius,
        width: props.width,
      }),
    [
      data,
      xScale,
      yScale,
      xAccessor,
      yAccessor,
      props.fill,
      props.baseline,
      props.radius,
      props.width,
    ],
  );

  useMark(node);
  return null;
}

export interface BarGroupProps {
  baseline?: number;
  radius?: number;
  /** Inner padding between the sub-bars of a group, 0–1. */
  groupPadding?: number;
}

/** Grouped multi-series bars from the chart's `series`. */
export function BarGroup(props: BarGroupProps): null {
  const { data, xScale, yScale, xAccessor, series } = useChartContext();

  const barSeries = useMemo<BarSeries<unknown>[]>(
    () => series.map((s) => ({ key: s.key, value: s.y, color: s.color })),
    [series],
  );

  const node = useMemo(
    () =>
      groupedBarMark({
        data,
        x: xAccessor,
        xScale,
        yScale,
        series: barSeries,
        baseline: props.baseline,
        radius: props.radius,
        groupPadding: props.groupPadding,
      }),
    [data, xScale, yScale, xAccessor, barSeries, props.baseline, props.radius, props.groupPadding],
  );

  useMark(node);
  return null;
}

export interface StackedBarsProps {
  radius?: number;
}

/** Stacked multi-series bars from the chart's `series`. */
export function StackedBars(props: StackedBarsProps): null {
  const { data, xScale, yScale, xAccessor, series } = useChartContext();

  const barSeries = useMemo<BarSeries<unknown>[]>(
    () => series.map((s) => ({ key: s.key, value: s.y, color: s.color })),
    [series],
  );

  const node = useMemo(
    () =>
      stackedBarMark({
        data,
        x: xAccessor,
        xScale,
        yScale,
        series: barSeries,
        radius: props.radius,
      }),
    [data, xScale, yScale, xAccessor, barSeries, props.radius],
  );

  useMark(node);
  return null;
}
