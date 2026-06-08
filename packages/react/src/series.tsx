import { useMemo } from 'react';
import { lineMark, pointMark } from '@chartistry/core';
import { useChartContext } from './context';
import { useMark } from './use-mark';

export interface LineSeriesProps {
  stroke?: string;
  strokeWidth?: number;
  /** Fill the area beneath the line. */
  area?: boolean;
  fill?: string;
  baseline?: number;
}

/** A line (optionally filled) through the chart's data series. */
export function LineSeries(props: LineSeriesProps): null {
  const { data, xScale, yScale, xAccessor, yAccessor } = useChartContext();

  const node = useMemo(
    () =>
      lineMark({
        data,
        x: xAccessor,
        y: yAccessor,
        xScale,
        yScale,
        stroke: props.stroke,
        strokeWidth: props.strokeWidth,
        area: props.area,
        fill: props.fill,
        baseline: props.baseline,
      }),
    [
      data,
      xScale,
      yScale,
      xAccessor,
      yAccessor,
      props.stroke,
      props.strokeWidth,
      props.area,
      props.fill,
      props.baseline,
    ],
  );

  useMark(node);
  return null;
}

export interface PointsProps {
  radius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

/** A dot at every datum in the chart's data series. */
export function Points(props: PointsProps): null {
  const { data, xScale, yScale, xAccessor, yAccessor } = useChartContext();

  const node = useMemo(
    () =>
      pointMark({
        data,
        x: xAccessor,
        y: yAccessor,
        xScale,
        yScale,
        radius: props.radius,
        fill: props.fill,
        stroke: props.stroke,
        strokeWidth: props.strokeWidth,
      }),
    [
      data,
      xScale,
      yScale,
      xAccessor,
      yAccessor,
      props.radius,
      props.fill,
      props.stroke,
      props.strokeWidth,
    ],
  );

  useMark(node);
  return null;
}
