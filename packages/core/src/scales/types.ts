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
  /**
   * Optional default formatter for tick labels. An axis uses this when no
   * explicit format is given, which is how a time scale labels its own ticks
   * as dates without the call site having to know.
   */
  tickFormat?(count?: number): (value: Domain) => string;
}

export interface ContinuousScale extends Scale<number> {
  /** Map a range position back to a domain value. */
  invert(position: number): number;
}

/** Domain value kinds a positional scale can carry. */
export type ScaleValue = string | number | Date;
