import type { Margin, MarginInput, Rect, Size } from '../types';

export const DEFAULT_MARGIN: Margin = { top: 16, right: 16, bottom: 32, left: 40 };

/** Normalize the flexible margin input into a full {@link Margin}. */
export function resolveMargin(input: MarginInput | undefined): Margin {
  if (input === undefined) return { ...DEFAULT_MARGIN };
  if (typeof input === 'number') {
    return { top: input, right: input, bottom: input, left: input };
  }
  return {
    top: input.top ?? DEFAULT_MARGIN.top,
    right: input.right ?? DEFAULT_MARGIN.right,
    bottom: input.bottom ?? DEFAULT_MARGIN.bottom,
    left: input.left ?? DEFAULT_MARGIN.left,
  };
}

/** Compute the inner plot rectangle left after reserving the margins. */
export function plotArea(size: Size, margin: Margin): Rect {
  return {
    x: margin.left,
    y: margin.top,
    width: Math.max(0, size.width - margin.left - margin.right),
    height: Math.max(0, size.height - margin.top - margin.bottom),
  };
}
