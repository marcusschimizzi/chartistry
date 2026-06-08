/**
 * Generate "nice", human-friendly tick values across [start, stop].
 * Steps are constrained to multiples of 1, 2, 5 × 10^n, mirroring the
 * approach popularised by d3-array's `ticks`.
 */
export function ticks(start: number, stop: number, count: number): number[] {
  if (!Number.isFinite(start) || !Number.isFinite(stop) || count <= 0) return [];
  if (start === stop) return [start];

  const step = tickStep(start, stop, count);
  if (!Number.isFinite(step) || step === 0) return [];

  const result: number[] = [];
  const first = Math.ceil(start / step);
  const last = Math.floor(stop / step);
  for (let i = first; i <= last; i++) {
    const value = i * step;
    // Avoid floating-point dust like 0.30000000000000004.
    result.push(roundToStep(value, step));
  }
  return result;
}

/** The "nice" increment between ticks for the given range and target count. */
export function tickStep(start: number, stop: number, count: number): number {
  const rawStep = Math.abs(stop - start) / Math.max(1, count);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;

  let niceMultiplier: number;
  if (normalized >= 7.5) niceMultiplier = 10;
  else if (normalized >= 3) niceMultiplier = 5;
  else if (normalized >= 1.5) niceMultiplier = 2;
  else niceMultiplier = 1;

  return niceMultiplier * magnitude;
}

/** Expand a domain outward to round tick boundaries. */
export function niceDomain(start: number, stop: number, count: number): [number, number] {
  if (start === stop) return [start, stop];
  const reversed = start > stop;
  let lo = reversed ? stop : start;
  let hi = reversed ? start : stop;

  const step = tickStep(lo, hi, count);
  if (Number.isFinite(step) && step > 0) {
    lo = Math.floor(lo / step) * step;
    hi = Math.ceil(hi / step) * step;
  }
  return reversed ? [hi, lo] : [lo, hi];
}

function roundToStep(value: number, step: number): number {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  return Number(value.toFixed(Math.min(decimals, 20)));
}
