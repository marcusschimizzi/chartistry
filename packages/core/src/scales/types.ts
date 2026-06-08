/**
 * A scale maps values from an abstract data `domain` into a visual `range`
 * (typically pixels). Scales are plain data + pure functions so they can be
 * created and reasoned about with zero framework or DOM involvement.
 */
export interface Scale<Domain> {
  /** Map a domain value to a position in the range. */
  (value: Domain): number;
  readonly domain: readonly Domain[];
  readonly range: readonly [number, number];
  /** Suggested tick values for axes/gridlines. */
  ticks(count?: number): Domain[];
  /** Width occupied by a single value. 0 for continuous scales. */
  bandwidth(): number;
}

export interface ContinuousScale extends Scale<number> {
  /** Map a range position back to a domain value. */
  invert(position: number): number;
}
