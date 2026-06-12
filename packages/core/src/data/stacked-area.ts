import { stack, type StackSegment, type StackSeries } from './stack';

/**
 * Stacked-area offset modes. `zero` stacks from the baseline (a stacked area);
 * `silhouette` centers each datum's stack on zero (a streamgraph).
 */
export type AreaOffset = 'zero' | 'silhouette';

/**
 * Stack the series, then apply the offset. Returns per-datum segments in data
 * units (`result[i][s]`), with `y0`/`y1` shifted for the chosen offset.
 */
export function stackedAreaLayout<D>(
  data: readonly D[],
  series: readonly StackSeries<D>[],
  offset: AreaOffset = 'zero',
): StackSegment[][] {
  const rows = stack(data, series);
  if (offset === 'zero') return rows;

  // silhouette: center each datum's stack on 0, so the band grows symmetrically.
  return rows.map((segments) => {
    if (segments.length === 0) return segments;
    let lo = Infinity;
    let hi = -Infinity;
    for (const s of segments) {
      if (s.y0 < lo) lo = s.y0;
      if (s.y1 > hi) hi = s.y1;
    }
    const center = (lo + hi) / 2;
    return segments.map((s) => ({ ...s, y0: s.y0 - center, y1: s.y1 - center }));
  });
}

/** The value-axis [min, max] a stacked area occupies for the given offset. */
export function stackedAreaExtent<D>(
  data: readonly D[],
  series: readonly StackSeries<D>[],
  offset: AreaOffset = 'zero',
): [number, number] {
  let min = 0;
  let max = 0;
  for (const segments of stackedAreaLayout(data, series, offset)) {
    for (const s of segments) {
      if (s.y0 < min) min = s.y0;
      if (s.y1 > max) max = s.y1;
    }
  }
  return [min, max];
}
