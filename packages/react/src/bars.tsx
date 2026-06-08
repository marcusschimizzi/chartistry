import { useMemo } from 'react';
import { barMark, groupedBarMark, stackedBarMark, type BarSeries } from '@chartistry/core';
import { useChartContext } from './context';
import { useMark } from './use-mark';

export interface BarsProps {
  fill?: string;
  baseline?: number;
  radius?: number;
  /** Bar thickness when the category scale has no bandwidth (linear x). */
  thickness?: number;
}

/**
 * Single-series bars over the chart's data. Use `xScaleType="band"` on <Chart>
 * for a categorical axis, and `orientation="horizontal"` on <Chart> to lay them
 * sideways.
 */
export function Bars(props: BarsProps): null {
  const { data, categoryScale, valueScale, orientation, xAccessor, yAccessor } = useChartContext();

  const node = useMemo(
    () =>
      barMark({
        data,
        category: xAccessor,
        value: yAccessor,
        categoryScale,
        valueScale,
        orientation,
        fill: props.fill,
        baseline: props.baseline,
        radius: props.radius,
        thickness: props.thickness,
      }),
    [
      data,
      categoryScale,
      valueScale,
      orientation,
      xAccessor,
      yAccessor,
      props.fill,
      props.baseline,
      props.radius,
      props.thickness,
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
  const { data, categoryScale, valueScale, orientation, xAccessor, series } = useChartContext();

  const barSeries = useMemo<BarSeries<unknown>[]>(
    () => series.map((s) => ({ key: s.key, value: s.y, color: s.color })),
    [series],
  );

  const node = useMemo(
    () =>
      groupedBarMark({
        data,
        category: xAccessor,
        categoryScale,
        valueScale,
        orientation,
        series: barSeries,
        baseline: props.baseline,
        radius: props.radius,
        groupPadding: props.groupPadding,
      }),
    [
      data,
      categoryScale,
      valueScale,
      orientation,
      xAccessor,
      barSeries,
      props.baseline,
      props.radius,
      props.groupPadding,
    ],
  );

  useMark(node);
  return null;
}

export interface StackedBarsProps {
  radius?: number;
}

/** Stacked multi-series bars from the chart's `series`. */
export function StackedBars(props: StackedBarsProps): null {
  const { data, categoryScale, valueScale, orientation, xAccessor, series } = useChartContext();

  const barSeries = useMemo<BarSeries<unknown>[]>(
    () => series.map((s) => ({ key: s.key, value: s.y, color: s.color })),
    [series],
  );

  const node = useMemo(
    () =>
      stackedBarMark({
        data,
        category: xAccessor,
        categoryScale,
        valueScale,
        orientation,
        series: barSeries,
        radius: props.radius,
      }),
    [data, categoryScale, valueScale, orientation, xAccessor, barSeries, props.radius],
  );

  useMark(node);
  return null;
}
