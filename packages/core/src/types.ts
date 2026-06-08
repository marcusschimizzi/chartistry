/** Shared geometric primitives used across the library. */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Inner spacing reserved around the plot area (for axes, labels, etc.). */
export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type MarginInput = number | Partial<Margin>;

/** A rectangular region in chart-local coordinates. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
