/**
 * Pie layout is a pure transform, kept separate from any mark: it turns a list
 * of values into angular spans. The result feeds `pieMark` (or anything else
 * that wants slices). Angles are radians, clockwise from 12 o'clock, matching
 * the `arc` scene node.
 */

const TAU = Math.PI * 2;

export interface PieSlice<D> {
  datum: D;
  index: number;
  value: number;
  startAngle: number;
  endAngle: number;
  /** Angle bisecting the slice — handy for placing labels. */
  midAngle: number;
}

export interface PieOptions<D> {
  value: (datum: D, index: number) => number;
  /** Where the first slice begins. Defaults to 0 (top). */
  startAngle?: number;
  /** Where the last slice ends. Defaults to a full turn (2π). */
  endAngle?: number;
  /** Gap between slices, in radians. Defaults to 0. */
  padAngle?: number;
  /** Comparator over data for slice order; omit to keep input order. */
  sort?: (a: D, b: D) => number;
}

/** Lay out `data` into pie/donut slices by value. Negative values are clamped to 0. */
export function pie<D>(data: readonly D[], options: PieOptions<D>): PieSlice<D>[] {
  const startAngle = options.startAngle ?? 0;
  const endAngle = options.endAngle ?? TAU;
  const padAngle = options.padAngle ?? 0;

  // Preserve original indices while optionally reordering for display.
  const order = data.map((_, i) => i);
  if (options.sort) {
    const cmp = options.sort;
    order.sort((a, b) => cmp(data[a]!, data[b]!));
  }

  const values = data.map((d, i) => Math.max(0, options.value(d, i)));
  const total = values.reduce((sum, v) => sum + v, 0);
  const span = endAngle - startAngle;
  const available = Math.max(0, Math.abs(span) - padAngle * data.length) * Math.sign(span || 1);

  const slices: PieSlice<D>[] = new Array(data.length);
  let angle = startAngle;
  for (const index of order) {
    const fraction = total > 0 ? values[index]! / total : 0;
    const sweep = fraction * available;
    const start = angle;
    const end = angle + sweep;
    slices[index] = {
      datum: data[index]!,
      index,
      value: values[index]!,
      startAngle: start,
      endAngle: end,
      midAngle: (start + end) / 2,
    };
    angle = end + padAngle;
  }
  return slices;
}

/** Cartesian centroid of a slice at the given radius — for label placement. */
export function arcCentroid(
  cx: number,
  cy: number,
  radius: number,
  midAngle: number,
): { x: number; y: number } {
  return { x: cx + radius * Math.sin(midAngle), y: cy - radius * Math.cos(midAngle) };
}
