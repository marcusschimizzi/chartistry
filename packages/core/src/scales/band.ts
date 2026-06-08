import type { Scale } from './types';

export interface BandScaleOptions<T extends string | number> {
  domain: readonly T[];
  range: readonly [number, number];
  /** Padding between bands, as a fraction of the step. 0–1. */
  paddingInner?: number;
  /** Padding before the first and after the last band, as a fraction. 0–1. */
  paddingOuter?: number;
  /** Shorthand to set both inner and outer padding at once. */
  padding?: number;
  /** Alignment of bands within the range. 0–1, defaults to 0.5 (centered). */
  align?: number;
}

/**
 * A band scale maps a discrete domain (categories) to evenly sized, padded
 * bands across the range — the workhorse for bar charts and categorical axes.
 * `scale(value)` returns the band's start; `bandwidth()` its width.
 */
export function bandScale<T extends string | number>(options: BandScaleOptions<T>): Scale<T> {
  const domain = options.domain;
  const [r0, r1] = options.range;
  const paddingInner = clamp01(options.paddingInner ?? options.padding ?? 0);
  const paddingOuter = clamp01(options.paddingOuter ?? options.padding ?? 0);
  const align = clamp01(options.align ?? 0.5);

  const n = domain.length;
  const rangeStart = Math.min(r0, r1);
  const totalSpan = Math.abs(r1 - r0);

  // step = bandwidth + inner gap; the classic d3-band derivation.
  const step = n > 0 ? totalSpan / Math.max(1, n - paddingInner + 2 * paddingOuter) : 0;
  const bandwidthValue = step * (1 - paddingInner);
  const start = rangeStart + (totalSpan - step * (n - paddingInner)) * align;

  const index = new Map<T, number>();
  domain.forEach((value, i) => index.set(value, i));

  const scale = ((value: T): number => {
    const i = index.get(value);
    if (i === undefined) return NaN;
    return start + step * i + (step - bandwidthValue) / 2;
  }) as Scale<T>;

  Object.defineProperties(scale, {
    domain: { value: Object.freeze([...domain]), enumerable: true },
    range: { value: Object.freeze([r0, r1]), enumerable: true },
  });

  scale.ticks = (): T[] => [...domain];
  scale.bandwidth = (): number => bandwidthValue;

  return scale;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
