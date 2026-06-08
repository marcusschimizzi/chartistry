import { createContext, useContext } from 'react';
import type { ContinuousScale, Rect, Size } from '@chartistry/core';
import type { MarkStore } from './mark-store';

/** Everything child marks need, shared down the tree by {@link Chart}. */
export interface ChartContextValue {
  size: Size;
  plot: Rect;
  /** The chart's data series, type-erased for context transport. */
  data: readonly unknown[];
  xScale: ContinuousScale;
  yScale: ContinuousScale;
  xAccessor: (datum: unknown, index: number) => number;
  yAccessor: (datum: unknown, index: number) => number;
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
