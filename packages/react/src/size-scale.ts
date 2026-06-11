import { sqrtScale, type ContinuousScale } from '@chartistry/core';

/**
 * The size scale shared by `<Bubbles>` and `<SizeLegend>` so the two stay in
 * lockstep. The domain is anchored at zero (`[0, max]`) so a value maps to
 * bubble AREA; the max is scanned directly to avoid the degenerate-range
 * padding that would inflate a uniform domain.
 */
export function sizeScaleFromData(
  data: readonly unknown[],
  size: (datum: unknown, index: number) => number,
  sizeRange: readonly [number, number],
  sizeDomain?: readonly [number, number],
): ContinuousScale {
  let max = 0;
  data.forEach((d, i) => {
    const v = size(d, i);
    if (Number.isFinite(v) && v > max) max = v;
  });
  const domain = sizeDomain ?? ([0, max] as const);
  return sqrtScale({ domain, range: sizeRange, clamp: true });
}
