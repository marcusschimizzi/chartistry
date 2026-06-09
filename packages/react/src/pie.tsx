import { useEffect, useMemo, useRef, useState } from 'react';
import { arcHitTest, pie, pieMark, type PieSlice } from '@chartistry/core';
import { useChartContext } from './context';
import { useMark } from './use-mark';

export interface PieProps {
  /** Slice value. Defaults to the chart's y accessor. */
  value?: (datum: unknown, index: number) => number;
  /** Inner radius as a fraction of the outer radius (0–1). > 0 makes a donut. */
  innerRadius?: number;
  /** Gap between slices, in radians. */
  padAngle?: number;
  /** Palette for slices. */
  colors?: readonly string[];
  /** Padding between the pie and the plot edge, in pixels. */
  padding?: number;
  /** Optional label for each slice. */
  label?: (datum: unknown, index: number) => string;
  /** Place labels at the slice centroid (`inside`, default) or `outside` with a leader line. */
  labelPlacement?: 'inside' | 'outside';
  /** Slices thinner than this (radians) are left unlabeled. Defaults to an adaptive value. */
  minLabelAngle?: number;
  /** Label font size in px. Defaults to 12. */
  labelFontSize?: number;
  /** Label text color. */
  labelColor?: string;
  /** Leader line color for outside labels. */
  leaderColor?: string;
  /** Pop the focused slice (pointer hover or keyboard) outward. Default true. */
  interactive?: boolean;
  /** Pixels to pop the focused slice outward. Defaults to 6. */
  activeOffset?: number;
}

/** Geometry the pointer subscription reads through a ref, so it stays current. */
interface PieGeometry {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  slices: PieSlice<unknown>[];
}

/**
 * A pie or donut, centered in the plot area. It reads the chart's data and (by
 * default) its y accessor for slice values, and keys each slice by the x value
 * so slices tween when the data changes. Add `innerRadius` for a donut.
 *
 * Hovering a slice pops it outward: the pointer is resolved to a slice with
 * pure angular hit-testing (radius + angle), so gaps and the donut hole
 * correctly register as no slice. Arrow-key navigation pops the focused slice
 * the same way (the Chart announces it via the live region), so the pie is
 * usable without a pointer.
 */
export function Pie(props: PieProps): null {
  const { data, plot, xAccessor, yAccessor, subscribePointer, active } = useChartContext();
  const value = props.value ?? yAccessor;
  const padding = props.padding ?? 4;
  const interactive = props.interactive ?? true;
  const activeOffset = props.activeOffset ?? 6;

  const labelPlacement = props.labelPlacement ?? 'inside';
  // Outside labels live beyond the arc, so reserve room for the leader + text.
  const labelReserve = props.label && labelPlacement === 'outside' ? 48 : 0;

  const cx = plot.width / 2;
  const cy = plot.height / 2;
  const outerRadius = Math.max(0, Math.min(plot.width, plot.height) / 2 - padding - labelReserve);
  const innerRadius = (props.innerRadius ?? 0) * outerRadius;

  // The angular spans used for both rendering and hit-testing. pie() is pure, so
  // these match the arcs pieMark draws from the same options exactly.
  const slices = useMemo(
    () =>
      pie(data, { value, ...(props.padAngle !== undefined ? { padAngle: props.padAngle } : {}) }),
    [data, value, props.padAngle],
  );

  // The hovered slice's original index, or null, plus whether the pointer is in
  // the plot at all. Driven by the pointer subscription; both flip only on a real
  // change (primitive setState bails otherwise), so moves don't re-render.
  const [pointerIndex, setPointerIndex] = useState<number | null>(null);
  const [pointerInPlot, setPointerInPlot] = useState(false);

  // The focused slice. While the pointer is in the plot it is the sole source of
  // truth — a miss (donut hole, angular gap) pops nothing, even though the
  // Chart's cartesian `active` may be set for a numeric x. Only when the pointer
  // is absent does focus fall back to the keyboard-navigated datum. `interactive`
  // gates both.
  const keyboardIndex = active ? active.index : null;
  const focusIndex = !interactive ? null : pointerInPlot ? pointerIndex : keyboardIndex;

  // Keep geometry in a ref so the once-registered pointer listener reads fresh
  // values without re-subscribing on every layout change.
  const geometryRef = useRef<PieGeometry>({ cx, cy, innerRadius, outerRadius, slices });
  geometryRef.current = { cx, cy, innerRadius, outerRadius, slices };

  useEffect(() => {
    if (!interactive) {
      setPointerInPlot(false);
      setPointerIndex(null);
      return;
    }
    return subscribePointer((point) => {
      if (!point) {
        setPointerInPlot(false);
        setPointerIndex(null);
        return;
      }
      setPointerInPlot(true);
      const g = geometryRef.current;
      const hit = arcHitTest(point.x, point.y, g.slices, {
        cx: g.cx,
        cy: g.cy,
        innerRadius: g.innerRadius,
        outerRadius: g.outerRadius,
      });
      setPointerIndex(hit < 0 ? null : hit);
    });
  }, [interactive, subscribePointer]);

  const node = useMemo(() => {
    // Key slices by category so they tween across data changes — but two rows
    // can share a label, and a duplicate key would let keyed diffing collapse
    // them into one slice. Disambiguate repeats with an occurrence suffix.
    const counts = new Map<string, number>();
    const id = (d: unknown, i: number): string => {
      const label = String(xAccessor(d, i));
      const n = counts.get(label) ?? 0;
      counts.set(label, n + 1);
      return n === 0 ? label : `${label}~${n}`;
    };
    return pieMark({
      data,
      value,
      cx,
      cy,
      outerRadius,
      innerRadius,
      padAngle: props.padAngle,
      colors: props.colors,
      id,
      label: props.label,
      labelPlacement,
      ...(props.minLabelAngle !== undefined ? { minLabelAngle: props.minLabelAngle } : {}),
      ...(props.labelFontSize !== undefined ? { labelFontSize: props.labelFontSize } : {}),
      ...(props.labelColor !== undefined ? { labelColor: props.labelColor } : {}),
      ...(props.leaderColor !== undefined ? { leaderColor: props.leaderColor } : {}),
      ...(focusIndex !== null ? { activeIndex: focusIndex, activeOffset } : {}),
    });
  }, [
    data,
    value,
    cx,
    cy,
    outerRadius,
    innerRadius,
    props.padAngle,
    props.colors,
    props.label,
    labelPlacement,
    props.minLabelAngle,
    props.labelFontSize,
    props.labelColor,
    props.leaderColor,
    xAccessor,
    focusIndex,
    activeOffset,
  ]);

  useMark(node);
  return null;
}
