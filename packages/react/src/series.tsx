import { useMemo } from 'react';
import { group, lineMark, pointMark, type SceneNode } from '@chartistry/core';
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

/** A line (optionally filled) through the chart's single data series. */
export function LineSeries(props: LineSeriesProps): null {
  const { data, categoryScale, valueScale, xAccessor, yAccessor } = useChartContext();

  const node = useMemo(
    () =>
      lineMark({
        data,
        x: xAccessor,
        y: yAccessor,
        xScale: categoryScale,
        yScale: valueScale,
        stroke: props.stroke,
        strokeWidth: props.strokeWidth,
        area: props.area,
        fill: props.fill,
        baseline: props.baseline,
      }),
    [
      data,
      categoryScale,
      valueScale,
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

/** A dot at every datum in the chart's single data series. */
export function Points(props: PointsProps): null {
  const { data, categoryScale, valueScale, xAccessor, yAccessor } = useChartContext();

  const node = useMemo(
    () =>
      pointMark({
        data,
        x: xAccessor,
        y: yAccessor,
        xScale: categoryScale,
        yScale: valueScale,
        radius: props.radius,
        fill: props.fill,
        stroke: props.stroke,
        strokeWidth: props.strokeWidth,
      }),
    [
      data,
      categoryScale,
      valueScale,
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

export interface LinesProps {
  strokeWidth?: number;
  /** Fill the area beneath each line. */
  area?: boolean;
  baseline?: number;
}

/** One colored line per entry in the chart's `series` — multi-line in a tag. */
export function Lines(props: LinesProps): null {
  const { data, categoryScale, valueScale, xAccessor, series } = useChartContext();

  const node = useMemo<SceneNode>(() => {
    const lines = series.map((s) =>
      lineMark({
        data,
        x: xAccessor,
        y: s.y,
        xScale: categoryScale,
        yScale: valueScale,
        stroke: s.color,
        strokeWidth: props.strokeWidth,
        area: props.area,
        baseline: props.baseline,
        key: `line:${s.key}`,
      }),
    );
    return group(lines, { key: 'lines' });
  }, [
    data,
    categoryScale,
    valueScale,
    xAccessor,
    series,
    props.strokeWidth,
    props.area,
    props.baseline,
  ]);

  useMark(node);
  return null;
}
