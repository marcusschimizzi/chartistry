import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  bandScale,
  colorScale as createColorScale,
  createChart,
  extent,
  linearScale,
  seriesExtent,
  stackExtent,
  type MarginInput,
  type Renderer,
  type RendererHandle,
  type Scale,
  type StackSeries,
} from '@chartistry/core';
import { createSvgRenderer } from '@chartistry/renderer-svg';
import {
  ChartContext,
  type ChartContextValue,
  type ResolvedSeries,
  type SeriesSpec,
  type XValue,
} from './context';
import { MarkStore } from './mark-store';

export interface ChartProps<D> {
  width: number;
  height: number;
  data: readonly D[];
  /** Accessor for the x value of a datum (a number, or a category for band). */
  x: (datum: D, index: number) => XValue;
  /** Single-series y accessor. Optional when `series` is provided instead. */
  y?: (datum: D, index: number) => number;
  /** Horizontal scale kind. Use `band` for bar charts and categorical axes. */
  xScaleType?: 'linear' | 'band';
  /** Named value series for multi-series marks (grouped/stacked bars, lines). */
  series?: ReadonlyArray<SeriesSpec<D>>;
  /** Make the y domain span stacked totals (for <StackedBars>). */
  stackY?: boolean;
  margin?: MarginInput;
  /** Override the auto-computed x domain (linear) or category order (band). */
  xDomain?: readonly XValue[];
  /** Override the auto-computed y domain. */
  yDomain?: readonly [number, number];
  /** Round the y domain to nice tick boundaries. Defaults to true. */
  niceY?: boolean;
  /** Inner padding between band-scale categories, 0–1. Defaults to 0.2. */
  bandPadding?: number;
  /** Palette for auto-colored series. */
  colors?: readonly string[];
  /** The pluggable rendering backend. Defaults to the SVG renderer. */
  renderer?: Renderer;
  children?: ReactNode;
}

const defaultRenderer = createSvgRenderer();
const noY = (): number => 0;

/**
 * The composition root for the React adapter. It resolves layout and scales,
 * shares them via context, hosts the active renderer in a plain `<div>`, and
 * repaints the collected marks whenever anything relevant changes. Child marks
 * (`<LineSeries>`, `<BarGroup>`, `<XAxis>`, ...) only describe what to draw —
 * the renderer decides how, which is what keeps SVG and Canvas interchangeable.
 */
export function Chart<D>(props: ChartProps<D>): ReactNode {
  const {
    width,
    height,
    data,
    x,
    y,
    xScaleType = 'linear',
    series,
    stackY = false,
    margin,
    xDomain,
    yDomain,
    niceY = true,
    bandPadding = 0.2,
    colors,
    renderer = defaultRenderer,
    children,
  } = props;

  const hostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<RendererHandle | null>(null);
  const paintQueuedRef = useRef(false);

  const storeRef = useRef<MarkStore | null>(null);
  storeRef.current ??= new MarkStore();
  const store = storeRef.current;

  const chart = useMemo(
    () => createChart({ width, height, margin }),
    // margin may be an object literal; compare structurally via JSON for stability.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width, height, JSON.stringify(margin ?? null)],
  );
  const { plot, size } = chart;

  // --- Horizontal scale: linear positions or categorical bands. ------------
  const categories = useMemo<XValue[]>(() => {
    if (xScaleType !== 'band') return [];
    if (xDomain) return [...xDomain];
    const seen: XValue[] = [];
    const known = new Set<XValue>();
    data.forEach((d, i) => {
      const value = x(d, i);
      if (!known.has(value)) {
        known.add(value);
        seen.push(value);
      }
    });
    return seen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xScaleType, data, JSON.stringify(xDomain ?? null)]);

  const [linX0, linX1] = (
    xScaleType === 'band'
      ? [0, 0]
      : xDomain
        ? [Number(xDomain[0]), Number(xDomain[1])]
        : extent(data.map((d, i) => Number(x(d, i))))
  ) as [number, number];

  const xScale = useMemo<Scale<XValue>>(() => {
    if (xScaleType === 'band') {
      return bandScale<XValue>({
        domain: categories,
        range: [0, plot.width],
        paddingInner: bandPadding,
      });
    }
    // Linear scale only accepts numbers; widen at the context boundary.
    return linearScale({
      domain: [linX0, linX1],
      range: [0, plot.width],
    }) as unknown as Scale<XValue>;
  }, [xScaleType, categories, plot.width, bandPadding, linX0, linX1]);

  // --- Vertical scale: from explicit domain, series, or single accessor. ----
  const stackSeries = useMemo<StackSeries<D>[]>(
    () => (series ? series.map((s) => ({ key: s.key, value: s.y })) : []),
    [series],
  );

  const [y0, y1] = useMemo<readonly [number, number]>(() => {
    if (yDomain) return yDomain;
    if (series && series.length > 0) {
      return stackY ? stackExtent(data, stackSeries) : seriesExtent(data, stackSeries);
    }
    const accessor = y ?? noY;
    return extent(data.map((d, i) => accessor(d, i)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, series, stackSeries, stackY, y, JSON.stringify(yDomain ?? null)]);

  const yScale = useMemo(
    () => linearScale({ domain: [y0, y1], range: [plot.height, 0], nice: niceY }),
    [y0, y1, plot.height, niceY],
  );

  // --- Resolve per-series colors once, from explicit color or palette. ------
  const resolvedSeries = useMemo<ResolvedSeries[]>(() => {
    if (!series) return [];
    const palette = createColorScale(
      series.map((s) => s.key),
      colors,
    );
    return series.map((s) => ({
      key: s.key,
      y: s.y as (d: unknown, i: number) => number,
      color: s.color ?? palette(s.key),
    }));
  }, [series, colors]);

  // Paint the current frame from the store, coalescing bursts into one repaint.
  const paint = useCallback(() => {
    paintQueuedRef.current = false;
    const handle = handleRef.current;
    if (!handle) return;
    handle.render(chart.compose(store.nodes()));
  }, [chart, store]);

  const requestPaint = useCallback(() => {
    if (paintQueuedRef.current) return;
    paintQueuedRef.current = true;
    queueMicrotask(paint);
  }, [paint]);

  // Mount / swap the renderer. Re-runs when the renderer instance changes,
  // which is exactly how you flip backends at runtime.
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const handle = renderer.mount(host, { width, height });
    handleRef.current = handle;
    requestPaint();
    return () => {
      handle.destroy();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderer]);

  // Keep the surface sized, then repaint with the new geometry/scales.
  useLayoutEffect(() => {
    handleRef.current?.resize({ width, height });
    requestPaint();
  }, [width, height, requestPaint]);

  // Any change to composed geometry (scales/plot) should repaint.
  useEffect(() => {
    requestPaint();
  }, [xScale, yScale, plot.x, plot.y, plot.width, plot.height, requestPaint]);

  const contextValue = useMemo<ChartContextValue>(
    () => ({
      size,
      plot,
      data: data as readonly unknown[],
      xScale,
      yScale,
      xAccessor: x as (d: unknown, i: number) => XValue,
      yAccessor: (y ?? noY) as (d: unknown, i: number) => number,
      series: resolvedSeries,
      store,
      requestPaint,
    }),
    [size, plot, data, xScale, yScale, x, y, resolvedSeries, store, requestPaint],
  );

  return (
    <div ref={hostRef} style={{ position: 'relative', width, height }}>
      <ChartContext.Provider value={contextValue}>{children}</ChartContext.Provider>
    </div>
  );
}
