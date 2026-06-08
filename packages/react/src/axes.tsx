import { useMemo } from 'react';
import { axisBottom, axisLeft, gridMark } from '@chartistry/core';
import { useChartContext } from './context';
import { useMark } from './use-mark';

export interface AxisProps {
  tickCount?: number;
  tickFormat?: (value: number) => string;
  color?: string;
  labelColor?: string;
}

/** Bottom (x) axis, pinned to the base of the plot area. */
export function XAxis(props: AxisProps): null {
  const { xScale, plot } = useChartContext();

  const node = useMemo(
    () =>
      axisBottom<number>({
        scale: xScale,
        offset: plot.height,
        tickCount: props.tickCount,
        tickFormat: props.tickFormat,
        color: props.color,
        labelColor: props.labelColor,
      }),
    [xScale, plot.height, props.tickCount, props.tickFormat, props.color, props.labelColor],
  );

  useMark(node);
  return null;
}

/** Left (y) axis, pinned to the left edge of the plot area. */
export function YAxis(props: AxisProps): null {
  const { yScale } = useChartContext();

  const node = useMemo(
    () =>
      axisLeft<number>({
        scale: yScale,
        offset: 0,
        tickCount: props.tickCount,
        tickFormat: props.tickFormat,
        color: props.color,
        labelColor: props.labelColor,
      }),
    [yScale, props.tickCount, props.tickFormat, props.color, props.labelColor],
  );

  useMark(node);
  return null;
}

export interface GridProps {
  axis?: 'x' | 'y';
  tickCount?: number;
  color?: string;
  strokeDash?: number[];
}

/** Background gridlines aligned to the x or y scale's ticks. */
export function Grid(props: GridProps): null {
  const { xScale, yScale, plot } = useChartContext();
  const axis = props.axis ?? 'y';

  const node = useMemo(
    () =>
      gridMark<number>({
        scale: axis === 'x' ? xScale : yScale,
        axis,
        length: axis === 'x' ? plot.height : plot.width,
        tickCount: props.tickCount,
        color: props.color,
        strokeDash: props.strokeDash,
      }),
    [axis, xScale, yScale, plot.height, plot.width, props.tickCount, props.color, props.strokeDash],
  );

  useMark(node);
  return null;
}
