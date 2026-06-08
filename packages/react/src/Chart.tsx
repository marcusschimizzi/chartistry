import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  createChart,
  extent,
  linearScale,
  type MarginInput,
  type Renderer,
  type RendererHandle,
} from '@chartistry/core';
import { createSvgRenderer } from '@chartistry/renderer-svg';
import { ChartContext, type ChartContextValue } from './context';
import { MarkStore } from './mark-store';

export interface ChartProps<D> {
  width: number;
  height: number;
  data: readonly D[];
  /** Accessor for the x domain value of a datum. */
  x: (datum: D, index: number) => number;
  /** Accessor for the y domain value of a datum. */
  y: (datum: D, index: number) => number;
  margin?: MarginInput;
  /** Override the auto-computed x domain. */
  xDomain?: readonly [number, number];
  /** Override the auto-computed y domain. */
  yDomain?: readonly [number, number];
  /** Round the y domain to nice tick boundaries. Defaults to true. */
  niceY?: boolean;
  /** The pluggable rendering backend. Defaults to the SVG renderer. */
  renderer?: Renderer;
  children?: ReactNode;
}

const defaultRenderer = createSvgRenderer();

/**
 * The composition root for the React adapter. It resolves layout and scales,
 * shares them via context, hosts the active renderer in a plain `<div>`, and
 * repaints the collected marks whenever anything relevant changes. Child marks
 * (`<LineSeries>`, `<XAxis>`, ...) only describe what to draw — the renderer
 * decides how, which is what keeps SVG and Canvas interchangeable.
 */
export function Chart<D>(props: ChartProps<D>): ReactNode {
  const {
    width,
    height,
    data,
    x,
    y,
    margin,
    xDomain,
    yDomain,
    niceY = true,
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

  // Domains derived from data; computed eagerly so scale memoization keys on
  // stable numbers rather than (often inline) accessor identities.
  const [x0, x1] = xDomain ?? extent(data.map((d, i) => x(d, i)));
  const [y0, y1] = yDomain ?? extent(data.map((d, i) => y(d, i)));

  const xScale = useMemo(
    () => linearScale({ domain: [x0, x1], range: [0, plot.width] }),
    [x0, x1, plot.width],
  );
  const yScale = useMemo(
    () => linearScale({ domain: [y0, y1], range: [plot.height, 0], nice: niceY }),
    [y0, y1, plot.height, niceY],
  );

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
      xAccessor: x as (d: unknown, i: number) => number,
      yAccessor: y as (d: unknown, i: number) => number,
      store,
      requestPaint,
    }),
    [size, plot, data, xScale, yScale, x, y, store, requestPaint],
  );

  return (
    <div ref={hostRef} style={{ position: 'relative', width, height }}>
      <ChartContext.Provider value={contextValue}>{children}</ChartContext.Provider>
    </div>
  );
}
