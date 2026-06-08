/**
 * An ordinal scale maps a discrete domain onto a discrete range of outputs,
 * cycling through the range when the domain is larger. Unlike the positional
 * {@link Scale}, its output need not be numeric — the common case is mapping
 * series keys to colors, so it is kept as its own small, focused type.
 */
export interface OrdinalScale<T extends string | number, R> {
  (value: T): R;
  readonly domain: readonly T[];
  readonly range: readonly R[];
}

export interface OrdinalScaleOptions<T extends string | number, R> {
  domain: readonly T[];
  range: readonly R[];
}

export function ordinalScale<T extends string | number, R>(
  options: OrdinalScaleOptions<T, R>,
): OrdinalScale<T, R> {
  const { domain, range } = options;
  const index = new Map<T, number>();
  domain.forEach((value, i) => index.set(value, i));

  const scale = ((value: T): R => {
    const known = index.get(value);
    const position = known ?? index.size;
    if (known === undefined) index.set(value, index.size);
    return range[position % range.length] as R;
  }) as OrdinalScale<T, R>;

  Object.defineProperties(scale, {
    domain: { value: Object.freeze([...domain]), enumerable: true },
    range: { value: Object.freeze([...range]), enumerable: true },
  });

  return scale;
}

/**
 * A balanced categorical palette for multi-series charts. Tuned to stay legible
 * on a light background and distinct from one another.
 */
export const categoricalColors: readonly string[] = [
  '#6366f1', // indigo
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#10b981', // emerald
  '#ef4444', // red
  '#3b82f6', // blue
  '#f97316', // orange
  '#06b6d4', // cyan
];

/** Convenience: an ordinal color scale over the default palette. */
export function colorScale<T extends string | number>(
  domain: readonly T[],
  range: readonly string[] = categoricalColors,
): OrdinalScale<T, string> {
  return ordinalScale({ domain, range });
}
