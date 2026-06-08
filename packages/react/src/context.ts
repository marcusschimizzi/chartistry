import { createContext, useContext } from 'react';
import type { ContinuousScale, Point, Rect, Scale, Size } from '@chartistry/core';
import type { MarkStore } from './mark-store';

/** A category (band), position (linear), or instant (time) domain value. */
export type XValue = number | string | Date;

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

/** A resolved series plus its current legend visibility. */
export interface LegendSeries extends ResolvedSeries {
  hidden: boolean;
}

/** One series' value at the active datum, with its pixel position on the value axis. */
export interface ActiveSeriesPoint {
  key: string;
  color: string;
  value: number;
  /** Plot-local pixel position along the value axis (y for vertical, x for horizontal). */
  position: number;
}

/** The datum currently under the pointer, resolved across every series. */
export interface ActivePoint {
  index: number;
  datum: unknown;
  /** The datum's category value. */
  xValue: XValue;
  /** Plot-local pixel position along the category axis (band center). */
  category: number;
  /** `horizontal` means the value axis runs along x and categories along y. */
  orientation: 'vertical' | 'horizontal';
  points: ActiveSeriesPoint[];
}

/** Everything child marks need, shared down the tree by {@link Chart}. */
export interface ChartContextValue {
  size: Size;
  plot: Rect;
  /** The chart's data rows, type-erased for context transport. */
  data: readonly unknown[];
  /** The scale displayed on the x axis (category or value, per orientation). */
  xScale: Scale<XValue>;
  /** The scale displayed on the y axis (value or category, per orientation). */
  yScale: Scale<XValue>;
  /** Band/positional scale over categories, regardless of orientation. */
  categoryScale: Scale<XValue>;
  /** Linear scale over values, regardless of orientation. */
  valueScale: ContinuousScale;
  /** `horizontal` lays the value axis along x (categories on y). */
  orientation: 'vertical' | 'horizontal';
  xAccessor: (datum: unknown, index: number) => XValue;
  /** Default single-series y accessor (for <LineSeries>, <Bars>, ...). */
  yAccessor: (datum: unknown, index: number) => number;
  /** Visible multi-series (hidden ones removed), what marks should draw. */
  series: readonly ResolvedSeries[];
  /** Every series including hidden ones, with visibility flags, for <Legend>. */
  allSeries: readonly LegendSeries[];
  /** Toggle a series' visibility by key. Rescales and repaints. */
  toggleSeries: (key: string) => void;
  /** DOM slot beneath the chart surface that <Legend> portals into. */
  legendSlot: HTMLElement | null;
  /** The datum currently under the pointer, or null when not hovering. */
  active: ActivePoint | null;
  /**
   * Subscribe to plot-local pointer moves; the listener receives {x, y} relative
   * to the plot origin, or null when the pointer leaves the plot. Imperative on
   * purpose: marks that need fine-grained pointer data (e.g. {@link Pie} angular
   * hit-testing) can read it without re-rendering the chart on every move.
   */
  subscribePointer: (listener: (point: Point | null) => void) => () => void;
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
