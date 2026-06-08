/**
 * Hit-testing lives in the core, as pure functions over positions — never over
 * DOM. That is what lets interaction work identically whether the chart was
 * painted as SVG elements or as a flat Canvas bitmap: there is nothing to
 * attach per-mark listeners to on Canvas, so we resolve the active datum
 * mathematically from the pointer position instead.
 */

/**
 * Index of the position nearest to `value`, or -1 when there are none. Runs a
 * simple linear scan, so it tolerates unsorted positions; pass `maxDistance` to
 * ignore the pointer when it strays too far from any datum.
 */
export function nearestIndex(
  value: number,
  positions: readonly number[],
  maxDistance = Infinity,
): number {
  let best = -1;
  let bestDistance = Infinity;
  for (let i = 0; i < positions.length; i++) {
    const position = positions[i];
    if (position === undefined || !Number.isFinite(position)) continue;
    const distance = Math.abs(position - value);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return bestDistance <= maxDistance ? best : -1;
}

/** True when (x, y) lies within the [0, width] x [0, height] plot rectangle. */
export function withinPlot(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && x <= width && y >= 0 && y <= height;
}
