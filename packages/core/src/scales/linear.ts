import type { ContinuousScale } from './types';
import { niceDomain, ticks as generateTicks } from './ticks';

export interface LinearScaleOptions {
  domain: readonly [number, number];
  range: readonly [number, number];
  /** Expand the domain to round tick boundaries before mapping. */
  nice?: boolean;
  /** Tick count used when `nice` rounds the domain. Defaults to 10. */
  niceCount?: number;
  /** Clamp outputs to the range so out-of-domain values stay in bounds. */
  clamp?: boolean;
}

/**
 * A continuous linear scale: `domain` → `range` by straight interpolation.
 * Handles inverted ranges (e.g. `[height, 0]`, the usual y-axis convention).
 */
export function linearScale(options: LinearScaleOptions): ContinuousScale {
  const niceCount = options.niceCount ?? 10;
  const [d0, d1] = options.nice
    ? niceDomain(options.domain[0], options.domain[1], niceCount)
    : options.domain;
  const [r0, r1] = options.range;
  const clamp = options.clamp ?? false;

  const domainSpan = d1 - d0;
  const rangeSpan = r1 - r0;

  const scale = ((value: number): number => {
    if (domainSpan === 0) return r0;
    let t = (value - d0) / domainSpan;
    if (clamp) t = Math.max(0, Math.min(1, t));
    return r0 + t * rangeSpan;
  }) as ContinuousScale;

  Object.defineProperties(scale, {
    domain: { value: Object.freeze([d0, d1]), enumerable: true },
    range: { value: Object.freeze([r0, r1]), enumerable: true },
  });

  scale.invert = (position: number): number => {
    if (rangeSpan === 0) return d0;
    let t = (position - r0) / rangeSpan;
    if (clamp) t = Math.max(0, Math.min(1, t));
    return d0 + t * domainSpan;
  };

  scale.ticks = (count = 10): number[] => generateTicks(d0, d1, count);

  scale.bandwidth = (): number => 0;

  return scale;
}

/** Convenience: derive [min, max] from raw values, ignoring non-finite ones. */
export function extent(values: Iterable<number>): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === Infinity) return [0, 1];
  if (min === max) return [min, max + 1];
  return [min, max];
}
