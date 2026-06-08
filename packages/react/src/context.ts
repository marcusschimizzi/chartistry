import { createContext, useContext } from 'react';
import type { ContinuousScale, Rect, Scale, Size } from '@chartistry/core';
import type { MarkStore } from './mark-store';

/** A category (band scale) or position (linear scale) value. */
export type XValue = number | string;

/** A named value series, used by multi-series marks (bars, multi-line). */
export interface SeriesSpec<D = never> {
  key: string;
  y: (datum: D, index: number) => number;
  /** Explicit color; otherwise assigned from the palette by position. */
  color?: string;
}

/** A series after the Chart has resolved its color. */
export interface ResolvedSeries {
  key: string;
  y: (datum: unknown, index: number) => number;
  color: string;
}

/** Everything child marks need, shared down the tree by {@link Chart}. */
export interface ChartContextValue {
  size: Size;
  plot: Rect;
  /** The chart's data rows, type-erased for context transport. */
  data: readonly unknown[];
  /** Continuous (linear) or categorical (band) horizontal scale. */
  xScale: Scale<XValue>;
  yScale: ContinuousScale;
  xAccessor: (datum: unknown, index: number) => XValue;
  /** Default single-series y accessor (for <LineSeries>, <Bars>, ...). */
  yAccessor: (datum: unknown, index: number) => number;
  /** Resolved multi-series, empty unless `series` was passed to <Chart>. */
  series: readonly ResolvedSeries[];
  store: MarkStore;
  /** Ask the Chart to repaint the active renderer on the next microtask. */
  requestPaint: () => void;
}

export const ChartContext = createContext<ChartContextValue | null>(null);

/** Read the surrounding {@link Chart} context, or throw if used outside one. */
export function useChartContext(): ChartContextValue {
  const ctx = useContext(ChartContext);
  if (!ctx) {
    throw new Error('[chartistry] Chart components must be rendered inside <Chart>.');
  }
  return ctx;
}
