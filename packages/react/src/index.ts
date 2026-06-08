/**
 * @chartistry/react — composable React components over the framework-agnostic
 * core. Components describe a chart declaratively; the active renderer paints
 * it. Swap renderers by passing a different `renderer` to <Chart>.
 */
export { Chart, type ChartProps } from './Chart';
export {
  LineSeries,
  type LineSeriesProps,
  Points,
  type PointsProps,
  Lines,
  type LinesProps,
} from './series';
export {
  Bars,
  type BarsProps,
  BarGroup,
  type BarGroupProps,
  StackedBars,
  type StackedBarsProps,
} from './bars';
export { XAxis, YAxis, type AxisProps, Grid, type GridProps } from './axes';
export {
  useChartContext,
  type ChartContextValue,
  type SeriesSpec,
  type ResolvedSeries,
  type XValue,
} from './context';
export { useMark } from './use-mark';
