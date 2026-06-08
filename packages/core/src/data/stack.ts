/**
 * Stacking is a pure data transform, deliberately kept separate from any mark
 * so it can feed stacked bars, stacked areas, or anything else. Positive and
 * negative values accumulate independently (the d3 convention), so mixed-sign
 * series stack correctly above and below the baseline.
 */

export interface StackSeries<D> {
  key: string;
  value: (datum: D, index: number) => number;
}

export interface StackSegment {
  key: string;
  /** Stacked lower bound, in data units. */
  y0: number;
  /** Stacked upper bound, in data units. */
  y1: number;
  /** The raw (unstacked) value for this segment. */
  value: number;
}

/**
 * Lay out series into cumulative segments per datum. The result is row-major:
 * `result[i][s]` is series `s`'s segment for datum `i`.
 */
export function stack<D>(data: readonly D[], series: readonly StackSeries<D>[]): StackSegment[][] {
  return data.map((datum, index) => {
    let positiveAcc = 0;
    let negativeAcc = 0;

    return series.map((s) => {
      const value = s.value(datum, index);
      if (value >= 0) {
        const segment: StackSegment = {
          key: s.key,
          y0: positiveAcc,
          y1: positiveAcc + value,
          value,
        };
        positiveAcc += value;
        return segment;
      }
      const segment: StackSegment = { key: s.key, y0: negativeAcc + value, y1: negativeAcc, value };
      negativeAcc += value;
      return segment;
    });
  });
}

/** The [min, max] domain a stacked layout occupies — handy for the value axis. */
export function stackExtent<D>(
  data: readonly D[],
  series: readonly StackSeries<D>[],
): [number, number] {
  let min = 0;
  let max = 0;
  for (let index = 0; index < data.length; index++) {
    const datum = data[index] as D;
    let positiveAcc = 0;
    let negativeAcc = 0;
    for (const s of series) {
      const value = s.value(datum, index);
      if (value >= 0) positiveAcc += value;
      else negativeAcc += value;
    }
    if (positiveAcc > max) max = positiveAcc;
    if (negativeAcc < min) min = negativeAcc;
  }
  return [min, max];
}

/** The [min, max] across every series value — the domain for grouped layouts. */
export function seriesExtent<D>(
  data: readonly D[],
  series: readonly StackSeries<D>[],
): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (let index = 0; index < data.length; index++) {
    const datum = data[index] as D;
    for (const s of series) {
      const value = s.value(datum, index);
      if (!Number.isFinite(value)) continue;
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }
  if (min === Infinity) return [0, 1];
  // Grouped value axes conventionally include the baseline at 0.
  return [Math.min(0, min), Math.max(0, max)];
}
