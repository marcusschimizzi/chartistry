import type { ContinuousScale } from './types';
import { niceDomain, ticks as generateTicks } from './ticks';

export interface SqrtScaleOptions {
  domain: readonly [number, number];
  range: readonly [number, number];
  /** Expand the domain to round tick boundaries before mapping. */
  nice?: boolean;
  /** Tick count used when `nice` rounds the domain. Defaults to 10. */
  niceCount?: number;
  /** Clamp outputs to the range so out-of-domain values stay in bounds. */
  clamp?: boolean;
}

// Sign-preserving square root, so the scale also handles negative domains.
const tx = (v: number): number => Math.sign(v) * Math.sqrt(Math.abs(v));

/**
 * A continuous scale whose output varies with the square root of the input.
 * When the output drives a radius, this maps a data VALUE to bubble AREA (since
 * area ∝ radius²) — the perceptually correct encoding for bubble size. In every
 * other respect it mirrors `linearScale`.
 */
export function sqrtScale(options: SqrtScaleOptions): ContinuousScale {
  const niceCount = options.niceCount ?? 10;
  const [d0, d1] = options.nice
    ? niceDomain(options.domain[0], options.domain[1], niceCount)
    : options.domain;
  const [r0, r1] = options.range;
  const clamp = options.clamp ?? false;

  const t0 = tx(d0);
  const t1 = tx(d1);
  const tSpan = t1 - t0;
  const rangeSpan = r1 - r0;

  const scale = ((value: number): number => {
    if (tSpan === 0) return r0;
    let t = (tx(value) - t0) / tSpan;
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
    const tv = t0 + t * tSpan;
    return Math.sign(tv) * tv * tv;
  };

  scale.ticks = (count = 10): number[] => generateTicks(d0, d1, count);
  scale.bandwidth = (): number => 0;

  return scale;
}
