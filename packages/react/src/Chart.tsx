import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  bandScale,
  categoricalColors,
  colorScale as createColorScale,
  createChart,
  extent,
  linearScale,
  nearestIndex,
  seriesExtent,
  stackExtent,
  timeScale,
  withinPlot,
  type ContinuousScale,
  type MarginInput,
  type Renderer,
  type RendererHandle,
  type Scale,
  type StackSeries,
} from '@chartistry/core';
import { createSvgRenderer } from '@chartistry/renderer-svg';
import {
  ChartContext,
  type ActivePoint,
  type ChartContextValue,
  type LegendSeries,
  type ResolvedSeries,
  type SeriesSpec,
  type XValue,
} from './context';
import { MarkStore } from './mark-store';
import { ChartDataTable, describePoint, srOnly } from './a11y';

export interface ChartProps<D> {
  width: number;
  height: number;
  data: readonly D[];
  /** Accessor for the x value of a datum. Defaults to the datum's index. */
  x?: (datum: D, index: number) => XValue;
  /** Single-series y accessor. Optional when `series` is provided instead. */
  y?: (datum: D, index: number) => number;
  /** Horizontal scale kind. `band` for categories, `time` for date axes. */
  xScaleType?: 'linear' | 'band' | 'time';
  /**
   * Lay the value axis horizontally (categories on y). Used for horizontal bars.
   * `x` stays the category accessor and `y` the value accessor either way.
   */
  orientation?: 'vertical' | 'horizontal';
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
  /** Track the pointer to drive <Tooltip>/<Crosshair>/<Highlight>. Default true. */
  interactive?: boolean;
  /** Accessible name for the chart (figure label). Strongly recommended. */
  title?: string;
  /** Longer description, announced as the figure's description. */
  description?: string;
  /** Header for the x column in the hidden data table. Defaults to "x". */
  xLabel?: string;
  /** Emit ARIA roles, a hidden data table, and keyboard nav. Default true. */
  accessible?: boolean;
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
    x = (_d, i) => i,
    y,
    xScaleType = 'linear',
    orientation = 'vertical',
    series,
    stackY = false,
    margin,
    xDomain,
    yDomain,
    niceY = true,
    bandPadding = 0.2,
    colors,
    interactive = true,
    title,
    description,
    xLabel = 'x',
    accessible = true,
    renderer = defaultRenderer,
    children,
  } = props;

  const hostRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<RendererHandle | null>(null);
  const paintQueuedRef = useRef(false);

  // The <Legend> portals into this slot, rendered beneath the chart surface.
  const [legendSlot, setLegendSlot] = useState<HTMLDivElement | null>(null);

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
  const horizontal = orientation === 'horizontal';

  // --- Category axis: linear positions, dates, or categorical bands. -------
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

  // The category axis runs along x for vertical charts, y for horizontal ones.
  const categoryScale = useMemo<Scale<XValue>>(() => {
    const range: [number, number] = horizontal ? [0, plot.height] : [0, plot.width];
    if (xScaleType === 'band') {
      // Bands are categorical (string | number); widen at the context boundary.
      return bandScale<string | number>({
        domain: categories as (string | number)[],
        range,
        paddingInner: bandPadding,
      }) as unknown as Scale<XValue>;
    }
    if (xScaleType === 'time') {
      // linX0/linX1 are epoch ms (Number(Date)); time scale handles the ticks.
      return timeScale({ domain: [linX0, linX1], range }) as unknown as Scale<XValue>;
    }
    // Linear scale only accepts numbers; widen at the context boundary.
    return linearScale({ domain: [linX0, linX1], range }) as unknown as Scale<XValue>;
  }, [xScaleType, categories, plot.width, plot.height, horizontal, bandPadding, linX0, linX1]);

  // --- Series resolution + legend visibility. ------------------------------
  const [hiddenKeys, setHiddenKeys] = useState<ReadonlySet<string>>(() => new Set());
  const toggleSeries = useCallback((key: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Colors are assigned over every key, so a series keeps its color whether or
  // not its peers are hidden — only the visible subset feeds scales and marks.
  const allSeries = useMemo<LegendSeries[]>(() => {
    if (!series) return [];
    const palette = createColorScale(
      series.map((s) => s.key),
      colors,
    );
    return series.map((s) => ({
      key: s.key,
      y: s.y as (d: unknown, i: number) => number,
      color: s.color ?? palette(s.key),
      hidden: hiddenKeys.has(s.key),
    }));
  }, [series, colors, hiddenKeys]);

  const visibleSeries = useMemo<ResolvedSeries[]>(
    () => allSeries.filter((s) => !s.hidden),
    [allSeries],
  );

  // --- Vertical scale: from explicit domain, visible series, or accessor. ---
  const stackSeries = useMemo<StackSeries<unknown>[]>(
    () => visibleSeries.map((s) => ({ key: s.key, value: s.y })),
    [visibleSeries],
  );

  const [y0, y1] = useMemo<readonly [number, number]>(() => {
    if (yDomain) return yDomain;
    const rows = data as readonly unknown[];
    if (visibleSeries.length > 0) {
      return stackY ? stackExtent(rows, stackSeries) : seriesExtent(rows, stackSeries);
    }
    const accessor = y ?? noY;
    return extent(data.map((d, i) => accessor(d, i)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, visibleSeries, stackSeries, stackY, y, JSON.stringify(yDomain ?? null)]);

  // The value axis runs along y for vertical charts, x for horizontal ones.
  const valueScale = useMemo<ContinuousScale>(() => {
    const range: [number, number] = horizontal ? [0, plot.width] : [plot.height, 0];
    return linearScale({ domain: [y0, y1], range, nice: niceY });
  }, [y0, y1, plot.width, plot.height, horizontal, niceY]);

  // Assign category/value to the actual x and y axes for this orientation.
  const xScale = horizontal ? (valueScale as unknown as Scale<XValue>) : categoryScale;
  const yScale = horizontal ? categoryScale : (valueScale as unknown as Scale<XValue>);

  // The series to interrogate on hover: the visible ones, or an implicit single
  // series wrapping the chart-level y accessor so single-series charts hover too.
  const interactiveSeries = useMemo<ResolvedSeries[]>(() => {
    if (visibleSeries.length > 0) return visibleSeries;
    if (allSeries.length > 0) return []; // multi-series, but all toggled off
    return [
      {
        key: 'value',
        y: (y ?? noY) as (d: unknown, i: number) => number,
        color: categoricalColors[0]!,
      },
    ];
  }, [visibleSeries, allSeries, y]);

  // Pixel position of each datum along the category axis — the hit-test targets.
  const positions = useMemo<number[]>(
    () => data.map((d, i) => categoryScale(x(d, i)) + categoryScale.bandwidth() / 2),
    [data, categoryScale, x],
  );

  // --- Pointer tracking. activeIndex is the datum under the cursor. ---------
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeIndexRef = useRef<number | null>(null);
  const positionsRef = useRef(positions);
  positionsRef.current = positions;

  const setActive = useCallback((next: number | null) => {
    if (next === activeIndexRef.current) return;
    activeIndexRef.current = next;
    setActiveIndex(next);
  }, []);

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const host = hostRef.current;
      if (!host) return;
      const rect = host.getBoundingClientRect();
      const localX = event.clientX - rect.left - plot.x;
      const localY = event.clientY - rect.top - plot.y;
      if (!withinPlot(localX, localY, plot.width, plot.height)) {
        setActive(null);
        return;
      }
      // Hit-test along the category axis (x for vertical, y for horizontal).
      const along = horizontal ? localY : localX;
      const index = nearestIndex(along, positionsRef.current);
      setActive(index < 0 ? null : index);
    },
    [plot.x, plot.y, plot.width, plot.height, horizontal, setActive],
  );

  const handlePointerLeave = useCallback(() => setActive(null), [setActive]);

  // --- Keyboard navigation + screen-reader announcements. ------------------
  const describeId = useId();
  const [liveText, setLiveText] = useState('');
  // The category (x) accessor labels each datum; format via the category scale.
  const formatX = useMemo(
    () =>
      (categoryScale.tickFormat ? categoryScale.tickFormat() : (v: XValue) => String(v)) as (
        v: XValue,
      ) => string,
    [categoryScale],
  );

  const announce = useCallback(
    (index: number | null) => {
      if (index === null) return setLiveText('');
      setLiveText(
        describePoint(
          data as readonly unknown[],
          index,
          x as (d: unknown, i: number) => XValue,
          formatX,
          interactiveSeries,
        ),
      );
    },
    [data, x, formatX, interactiveSeries],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const n = data.length;
      if (n === 0) return;
      const current = activeIndexRef.current;
      let next: number | null = current;
      switch (event.key) {
        case 'ArrowRight':
          next = current === null ? 0 : Math.min(n - 1, current + 1);
          break;
        case 'ArrowLeft':
          next = current === null ? n - 1 : Math.max(0, current - 1);
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = n - 1;
          break;
        case 'Escape':
          setActive(null);
          announce(null);
          return;
        default:
          return;
      }
      event.preventDefault();
      setActive(next);
      announce(next);
    },
    [data.length, setActive, announce],
  );

  const handleBlur = useCallback(() => {
    setActive(null);
    announce(null);
  }, [setActive, announce]);

  const active = useMemo<ActivePoint | null>(() => {
    if (activeIndex === null || activeIndex < 0 || activeIndex >= data.length) return null;
    const datum = data[activeIndex];
    const points = interactiveSeries.map((s) => {
      const value = s.y(datum, activeIndex);
      return { key: s.key, color: s.color, value, y: valueScale(value) };
    });
    return {
      index: activeIndex,
      datum,
      xValue: x(data[activeIndex] as D, activeIndex),
      x: positions[activeIndex] ?? 0,
      points,
    };
  }, [activeIndex, data, interactiveSeries, positions, valueScale, x]);

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
    const surface = surfaceRef.current;
    if (!surface) return;
    const handle = renderer.mount(surface, { width, height });
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
      categoryScale,
      valueScale,
      orientation,
      xAccessor: x as (d: unknown, i: number) => XValue,
      yAccessor: (y ?? noY) as (d: unknown, i: number) => number,
      series: visibleSeries,
      allSeries,
      toggleSeries,
      legendSlot,
      active,
      store,
      requestPaint,
    }),
    [
      size,
      plot,
      data,
      xScale,
      yScale,
      categoryScale,
      valueScale,
      orientation,
      x,
      y,
      visibleSeries,
      allSeries,
      toggleSeries,
      legendSlot,
      active,
      store,
      requestPaint,
    ],
  );

  const describable = accessible && description !== undefined;

  return (
    <div
      style={{ display: 'inline-flex', flexDirection: 'column' }}
      role={accessible ? 'figure' : undefined}
      aria-label={accessible ? (title ?? 'Chart') : undefined}
      aria-describedby={describable ? describeId : undefined}
    >
      {describable && (
        <p id={describeId} style={srOnly}>
          {description} Use the arrow keys to move through data points.
        </p>
      )}
      <div
        ref={hostRef}
        style={{ position: 'relative', width, height, touchAction: 'none', outline: 'none' }}
        // role="application" lets arrow keys reach our handler even in a screen
        // reader's browse mode; the hidden table below it stays browseable.
        role={accessible ? 'application' : undefined}
        aria-roledescription={accessible ? 'interactive chart' : undefined}
        aria-label={accessible ? (title ?? 'Chart') : undefined}
        tabIndex={accessible ? 0 : undefined}
        onPointerMove={interactive ? handlePointerMove : undefined}
        onPointerLeave={interactive ? handlePointerLeave : undefined}
        onKeyDown={accessible ? handleKeyDown : undefined}
        onBlur={accessible ? handleBlur : undefined}
      >
        {/* The renderer owns this surface; React owns the overlay layer above it. */}
        <div ref={surfaceRef} style={{ position: 'absolute', inset: 0 }} />
        <ChartContext.Provider value={contextValue}>{children}</ChartContext.Provider>
      </div>

      {accessible && (
        <>
          <div aria-live="polite" role="status" style={srOnly}>
            {liveText}
          </div>
          <ChartDataTable
            caption={title ?? 'Chart data'}
            xLabel={xLabel}
            data={data as readonly unknown[]}
            xAccessor={x as (d: unknown, i: number) => XValue}
            formatX={formatX}
            series={interactiveSeries}
          />
        </>
      )}

      {/* <Legend> portals here, so it sits outside the drawing/hit-test area. */}
      <div ref={setLegendSlot} />
    </div>
  );
}
