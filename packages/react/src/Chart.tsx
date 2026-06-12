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
  nearestPoint,
  seriesExtent,
  stackedAreaExtent,
  timeScale,
  withinPlot,
  type ContinuousScale,
  type MarginInput,
  type Point,
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
import { ChartDataTable, describePoint, srOnly, type GridA11y } from './a11y';

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
   * Vertical scale kind. `linear` (default) is a value axis; `band` makes the y
   * axis categorical (a second category axis), for grid charts like `<Heatmap>`.
   * With `band`, provide `yCategory` for the row categories.
   */
  yScaleType?: 'linear' | 'band';
  /** Row category accessor, when `yScaleType="band"`. */
  yCategory?: (datum: D, index: number) => XValue;
  /** Override the auto-computed row category order (band y), like `xDomain` for
   * columns. Lets you fix row order or declare empty rows. */
  yCategoryDomain?: readonly XValue[];
  /** Per-datum value, e.g. a heatmap cell's value (drives color and a11y). */
  value?: (datum: D, index: number) => number;
  /** For a time axis, snap ticks and format labels in UTC instead of local time. */
  utc?: boolean;
  /** For a time axis, BCP-47 locale(s) for tick labels (uses `Intl`). */
  locale?: string | string[];
  /**
   * Lay the value axis horizontally (categories on y). Used for horizontal bars.
   * `x` stays the category accessor and `y` the value accessor either way.
   */
  orientation?: 'vertical' | 'horizontal';
  /** Named value series for multi-series marks (grouped/stacked bars, lines). */
  series?: ReadonlyArray<SeriesSpec<D>>;
  /**
   * Make the y domain span stacked totals (for <StackedBars>/<StackedArea>).
   * Pass `'silhouette'` for a centered, streamgraph value domain.
   */
  stackY?: boolean | 'silhouette';
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
  /**
   * How the pointer resolves the active datum. `category` (default) snaps to the
   * nearest column along the category axis — right for bars, lines, and areas.
   * `point` finds the nearest datum in 2D — right for scatter/bubble charts,
   * where both axes are continuous; it targets the first series.
   */
  hitTest?: 'category' | 'point';
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
    yScaleType = 'linear',
    yCategory,
    yCategoryDomain,
    value,
    utc = false,
    locale,
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
    hitTest = 'category',
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
  // A grid (heatmap): two band axes. Columns are always x and rows always y, so
  // orientation does not apply — there is no value axis to swap. Requires the
  // row accessor; without it `yScaleType="band"` is inert (falls back to value).
  const isGrid = yScaleType === 'band' && yCategory != null;

  // --- Category axis: linear positions, dates, or categorical bands. -------
  const categories = useMemo<XValue[]>(() => {
    if (xScaleType !== 'band') return [];
    if (xDomain) return [...xDomain];
    const seen: XValue[] = [];
    // Dates are objects: dedup by primitive instant so two equal-instant Dates
    // collapse to one band, matching how bandScale keys its domain.
    const known = new Set<string | number>();
    data.forEach((d, i) => {
      const value = x(d, i);
      const key = value instanceof Date ? value.getTime() : value;
      if (!known.has(key)) {
        known.add(key);
        seen.push(value);
      }
    });
    return seen;
    // Categories are derived by calling x(d, i), so the accessor is a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xScaleType, data, x, JSON.stringify(xDomain ?? null)]);

  // Time accepts Date | ISO string | epoch ms; linear, plain numbers.
  const toAxisNumber =
    xScaleType === 'time' ? (v: XValue) => +new Date(v) : (v: XValue) => Number(v);
  const [linX0, linX1] = (
    xScaleType === 'band'
      ? [0, 0]
      : xDomain
        ? [toAxisNumber(xDomain[0]!), toAxisNumber(xDomain[1]!)]
        : extent(data.map((d, i) => toAxisNumber(x(d, i))))
  ) as [number, number];

  // The category axis runs along x for vertical charts, y for horizontal ones.
  const categoryScale = useMemo<Scale<XValue>>(() => {
    // In a grid the category axis is always x (columns span the width); only a
    // plain horizontal chart puts it on the height.
    const range: [number, number] =
      horizontal && !isGrid ? [0, plot.height] : [0, plot.width];
    if (xScaleType === 'band') {
      // bandScale accepts string | number | Date and keys Dates by instant.
      return bandScale<XValue>({
        domain: categories,
        range,
        paddingInner: bandPadding,
      }) as unknown as Scale<XValue>;
    }
    if (xScaleType === 'time') {
      // linX0/linX1 are epoch ms (Number(Date)); time scale handles the ticks.
      return timeScale({
        domain: [linX0, linX1],
        range,
        utc,
        ...(locale !== undefined ? { locale } : {}),
      }) as unknown as Scale<XValue>;
    }
    // Linear scale only accepts numbers; widen at the context boundary.
    return linearScale({ domain: [linX0, linX1], range }) as unknown as Scale<XValue>;
  }, [
    xScaleType,
    categories,
    plot.width,
    plot.height,
    horizontal,
    isGrid,
    bandPadding,
    linX0,
    linX1,
    utc,
    locale,
  ]);

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
      if (!stackY) return seriesExtent(rows, stackSeries);
      return stackedAreaExtent(rows, stackSeries, stackY === 'silhouette' ? 'silhouette' : 'zero');
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

  // Optional second category axis (yScaleType="band"): a band scale over the
  // row categories, for grid charts like <Heatmap>. Replaces the value axis.
  const rowCategories = useMemo<XValue[]>(() => {
    if (yScaleType !== 'band' || !yCategory) return [];
    // An explicit domain fixes row order and can declare empty rows, mirroring
    // xDomain for columns; otherwise rows are the first-seen yCategory values.
    if (yCategoryDomain) return [...yCategoryDomain];
    const seen: XValue[] = [];
    const known = new Set<string | number>();
    data.forEach((d, i) => {
      const v = yCategory(d, i);
      const key = v instanceof Date ? v.getTime() : v;
      if (!known.has(key)) {
        known.add(key);
        seen.push(v);
      }
    });
    return seen;
    // yCategoryDomain is a stable array prop; stringify keeps deps shallow-safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yScaleType, yCategory, data, JSON.stringify(yCategoryDomain ?? null)]);

  const rowScale = useMemo<Scale<XValue> | null>(() => {
    // Only a true grid (band y + a row accessor) replaces the value axis;
    // `yScaleType="band"` alone, with no yCategory, leaves the value axis intact.
    if (!isGrid) return null;
    return bandScale<XValue>({
      domain: rowCategories,
      range: [0, plot.height],
      paddingInner: bandPadding,
    }) as unknown as Scale<XValue>;
  }, [isGrid, rowCategories, plot.height, bandPadding]);

  // Assign category/value to the actual x and y axes for this orientation. A
  // band y axis (rowScale) is a two-category grid: columns are always x and
  // rows always y, so orientation does not flip it (there is no value axis to
  // swap). Otherwise category/value swap with orientation as usual.
  const xScale =
    rowScale != null
      ? categoryScale
      : horizontal
        ? (valueScale as unknown as Scale<XValue>)
        : categoryScale;
  const yScale =
    rowScale ?? (horizontal ? categoryScale : (valueScale as unknown as Scale<XValue>));

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

  // The chart-level value accessor that <Bubbles>/<Points> draw with. Shared
  // with the context below so 2D hit-testing matches exactly where marks land.
  const yAccessor = (y ?? noY) as (d: unknown, i: number) => number;

  // For 2D (scatter/bubble) hit-testing: each datum's plot-pixel position, using
  // the same y accessor the points are drawn with, so the pointer resolves the
  // nearest point against the actual circles.
  const pointPositions = useMemo<Point[]>(() => {
    return data.map((d, i) => {
      const valuePos = valueScale(yAccessor(d, i));
      const categoryPos = positions[i] ?? 0;
      return horizontal ? { x: valuePos, y: categoryPos } : { x: categoryPos, y: valuePos };
    });
  }, [data, yAccessor, valueScale, positions, horizontal]);
  const pointPositionsRef = useRef(pointPositions);
  pointPositionsRef.current = pointPositions;

  // For grid charts (two band axes): the column/row band centers and a lookup
  // from (column, row) to datum, so the pointer resolves a cell in 2D.
  const grid = useMemo(() => {
    if (!rowScale || !yCategory) return null;
    const keyOf = (v: XValue) => (v instanceof Date ? v.getTime() : v);
    const colCats = categoryScale.domain;
    const rowCats = rowScale.domain;
    const colCenters = colCats.map((c) => categoryScale(c) + categoryScale.bandwidth() / 2);
    const rowCenters = rowCats.map((r) => rowScale(r) + rowScale.bandwidth() / 2);
    // Nested column→row map so category labels containing the separator can't
    // collide into the same flat string key.
    const index = new Map<string | number, Map<string | number, number>>();
    data.forEach((d, i) => {
      const col = keyOf(x(d, i));
      let rows = index.get(col);
      if (!rows) index.set(col, (rows = new Map()));
      rows.set(keyOf(yCategory(d, i)), i);
    });
    const colKeys = colCats.map(keyOf);
    const rowKeys = rowCats.map(keyOf);
    // Locate a datum's cell within the grid, for keyboard navigation.
    const cellOf = (i: number) => ({
      ci: colKeys.indexOf(keyOf(x(data[i] as D, i))),
      ri: rowKeys.indexOf(keyOf(yCategory(data[i] as D, i))),
    });
    // The datum at a column/row cell, or null when the grid is sparse there.
    const at = (ci: number, ri: number) =>
      index.get(colKeys[ci]!)?.get(rowKeys[ri]!) ?? null;
    // The first/last datum that actually occupies a cell on the grid, scanning
    // in row-major order. Used to seed keyboard focus so it can only land on a
    // rendered cell — never a datum whose column/row is outside the scales.
    const scan = (reverse: boolean): number | null => {
      for (let r = 0; r < rowKeys.length; r++) {
        const ri = reverse ? rowKeys.length - 1 - r : r;
        for (let c = 0; c < colKeys.length; c++) {
          const ci = reverse ? colKeys.length - 1 - c : c;
          const cell = at(ci, ri);
          if (cell !== null) return cell;
        }
      }
      return null;
    };
    const firstCell = () => scan(false);
    const lastCell = () => scan(true);
    return {
      colCats,
      rowCats,
      colCenters,
      rowCenters,
      index,
      keyOf,
      cellOf,
      at,
      firstCell,
      lastCell,
    };
  }, [rowScale, categoryScale, data, x, yCategory]);
  const gridRef = useRef(grid);
  gridRef.current = grid;

  const setActive = useCallback((next: number | null) => {
    if (next === activeIndexRef.current) return;
    activeIndexRef.current = next;
    setActiveIndex(next);
  }, []);

  // Marks that hit-test against raw pointer coordinates (e.g. <Pie>) subscribe
  // here. Kept imperative so a pointer move only re-renders marks whose own
  // resolved state actually changes, not the whole chart on every move.
  const pointerListenersRef = useRef(new Set<(point: Point | null) => void>());
  const notifyPointer = useCallback((point: Point | null) => {
    for (const listener of pointerListenersRef.current) listener(point);
  }, []);
  const subscribePointer = useCallback((listener: (point: Point | null) => void) => {
    const listeners = pointerListenersRef.current;
    listeners.add(listener);
    return () => listeners.delete(listener);
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
        notifyPointer(null);
        return;
      }
      notifyPointer({ x: localX, y: localY });
      const g = gridRef.current;
      if (g) {
        // Grid (two band axes): resolve the cell by nearest column AND row.
        const ci = nearestIndex(localX, g.colCenters);
        const ri = nearestIndex(localY, g.rowCenters);
        const cell =
          ci < 0 || ri < 0
            ? undefined
            : g.index.get(g.keyOf(g.colCats[ci]!))?.get(g.keyOf(g.rowCats[ri]!));
        setActive(cell ?? null);
        return;
      }
      // `point`: nearest datum in 2D (scatter/bubble). `category` (default):
      // nearest column along the category axis (x for vertical, y for horizontal).
      const index =
        hitTest === 'point'
          ? nearestPoint(localX, localY, pointPositionsRef.current)
          : nearestIndex(horizontal ? localY : localX, positionsRef.current);
      setActive(index < 0 ? null : index);
    },
    [plot.x, plot.y, plot.width, plot.height, horizontal, hitTest, setActive, notifyPointer],
  );

  const handlePointerLeave = useCallback(() => {
    setActive(null);
    notifyPointer(null);
  }, [setActive, notifyPointer]);

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

  // a11y for a grid (heatmap): announce the column, row, and cell value.
  const gridA11y = useMemo<GridA11y | undefined>(() => {
    if (yScaleType !== 'band' || !yCategory || !value) return undefined;
    return {
      rowLabel: 'Row',
      rowAccessor: yCategory as (d: unknown, i: number) => XValue,
      formatRow: (v: XValue) => String(v),
      value: value as (d: unknown, i: number) => number,
    };
  }, [yScaleType, yCategory, value]);

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
          gridA11y,
        ),
      );
    },
    [data, x, formatX, interactiveSeries, gridA11y],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const n = data.length;
      if (n === 0) return;
      const current = activeIndexRef.current;
      if (event.key === 'Escape') {
        setActive(null);
        notifyPointer(null);
        announce(null);
        return;
      }
      // Grid (heatmap): arrows move spatially by column/row, not by flat index,
      // so focus follows the visible grid.
      const g = gridRef.current;
      if (g) {
        // From no selection, land on a cell that actually exists on the grid
        // (the first or last occupied cell in row-major order) so keyboard users
        // can always begin — even on a sparse grid with no populated corner —
        // and never focus a datum whose column/row falls outside the scales.
        if (current === null) {
          let start: number | null;
          switch (event.key) {
            case 'ArrowLeft':
            case 'ArrowUp':
            case 'End':
              start = g.lastCell();
              break;
            case 'ArrowRight':
            case 'ArrowDown':
            case 'Home':
              start = g.firstCell();
              break;
            default:
              return;
          }
          if (start === null) return;
          event.preventDefault();
          setActive(start);
          announce(start);
          return;
        }
        // Home/End go to the first/last occupied cell (row-major), matching the
        // initial-arrow behavior so they work on sparse grids too.
        if (event.key === 'Home' || event.key === 'End') {
          const target = event.key === 'Home' ? g.firstCell() : g.lastCell();
          if (target === null) return;
          event.preventDefault();
          setActive(target);
          announce(target);
          return;
        }
        const cols = g.colCats.length;
        const rows = g.rowCats.length;
        let { ci, ri } = g.cellOf(current);
        // The active datum may no longer be on the grid (e.g. a domain change
        // dropped its column/row). Re-seed from a real cell rather than letting
        // a -1 index slide to column/row 0 against a stale datum.
        if (ci < 0 || ri < 0) {
          const reseed =
            event.key === 'ArrowLeft' || event.key === 'ArrowUp'
              ? g.lastCell()
              : g.firstCell();
          if (reseed === null) return;
          event.preventDefault();
          setActive(reseed);
          announce(reseed);
          return;
        }
        switch (event.key) {
          case 'ArrowRight':
            ci = Math.min(cols - 1, ci + 1);
            break;
          case 'ArrowLeft':
            ci = Math.max(0, ci - 1);
            break;
          case 'ArrowDown':
            ri = Math.min(rows - 1, ri + 1);
            break;
          case 'ArrowUp':
            ri = Math.max(0, ri - 1);
            break;
          default:
            return;
        }
        event.preventDefault();
        const cell = g.at(ci, ri);
        if (cell === null) return; // don't step onto an empty cell
        setActive(cell);
        announce(cell);
        return;
      }
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
        default:
          return;
      }
      event.preventDefault();
      setActive(next);
      announce(next);
    },
    [data.length, setActive, announce, notifyPointer],
  );

  // Blur and Escape clear pointer-driven state too (e.g. a popped pie slice), so
  // it can't linger after focus leaves until the next pointer move.
  const handleBlur = useCallback(() => {
    setActive(null);
    notifyPointer(null);
    announce(null);
  }, [setActive, announce, notifyPointer]);

  const active = useMemo<ActivePoint | null>(() => {
    if (activeIndex === null || activeIndex < 0 || activeIndex >= data.length) return null;
    const datum = data[activeIndex];
    // Grid (heatmap) mode: the active "point" is the cell itself — its value at
    // the cell center — so Tooltip/Crosshair/Highlight read the real value and
    // anchor to the row, not a zeroed value-axis position.
    const points =
      rowScale && value && yCategory
        ? [
            {
              key: 'value',
              color: categoricalColors[0]!,
              value: value(datum as D, activeIndex),
              position: rowScale(yCategory(datum as D, activeIndex)) + rowScale.bandwidth() / 2,
            },
          ]
        : interactiveSeries.map((s) => {
            const v = s.y(datum, activeIndex);
            return { key: s.key, color: s.color, value: v, position: valueScale(v) };
          });
    return {
      index: activeIndex,
      datum,
      xValue: x(data[activeIndex] as D, activeIndex),
      category: positions[activeIndex] ?? 0,
      // A grid is always columns-on-x / rows-on-y, so overlays must read it as
      // vertical regardless of the prop — otherwise Tooltip/Crosshair/Highlight
      // would swap the category/value coordinates and anchor in the wrong place.
      orientation: isGrid ? 'vertical' : orientation,
      points,
    };
  }, [
    activeIndex,
    data,
    interactiveSeries,
    positions,
    valueScale,
    x,
    orientation,
    isGrid,
    rowScale,
    value,
    yCategory,
  ]);

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
      stackOffset: stackY === 'silhouette' ? 'silhouette' : 'zero',
      xAccessor: x as (d: unknown, i: number) => XValue,
      yAccessor,
      rowAccessor: yCategory as ((d: unknown, i: number) => XValue) | undefined,
      value: value as ((d: unknown, i: number) => number) | undefined,
      series: visibleSeries,
      allSeries,
      toggleSeries,
      legendSlot,
      active,
      subscribePointer,
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
      stackY,
      x,
      yAccessor,
      yCategory,
      value,
      visibleSeries,
      allSeries,
      toggleSeries,
      legendSlot,
      active,
      subscribePointer,
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
            grid={gridA11y}
          />
        </>
      )}

      {/* <Legend> portals here, so it sits outside the drawing/hit-test area. */}
      <div ref={setLegendSlot} />
    </div>
  );
}
