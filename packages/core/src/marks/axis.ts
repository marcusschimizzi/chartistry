import { group, line, text, type SceneNode, type TextStyle } from '../scene/nodes';
import type { Scale } from '../scales/types';

export type AxisOrientation = 'bottom' | 'left' | 'top' | 'right';

export interface AxisOptions<T extends string | number> {
  scale: Scale<T>;
  orientation: AxisOrientation;
  /**
   * Position of the axis baseline along the cross-axis, in plot coordinates.
   * For `bottom` this is a y value (usually plot height); for `left`, an x.
   */
  offset?: number;
  tickCount?: number;
  /** Length of tick marks. */
  tickSize?: number;
  /** Gap between a tick and its label. */
  tickPadding?: number;
  tickFormat?: (value: T) => string;
  color?: string;
  /** Color for tick labels; falls back to `color`. */
  labelColor?: string;
  fontSize?: number;
  fontFamily?: string;
  key?: string;
}

const DEFAULTS = {
  tickSize: 6,
  tickPadding: 4,
  color: '#94a3b8',
  labelColor: '#475569',
  fontSize: 11,
  fontFamily: 'system-ui, sans-serif',
};

/**
 * Render an axis (domain line + ticks + labels) for any scale. The axis works
 * off the scale's own `range`/`ticks`, so it stays correct for both continuous
 * and band scales without special-casing at the call site.
 */
export function axisMark<T extends string | number>(options: AxisOptions<T>): SceneNode {
  const { scale, orientation } = options;
  const tickSize = options.tickSize ?? DEFAULTS.tickSize;
  const tickPadding = options.tickPadding ?? DEFAULTS.tickPadding;
  const color = options.color ?? DEFAULTS.color;
  const labelColor = options.labelColor ?? options.color ?? DEFAULTS.labelColor;
  const fontSize = options.fontSize ?? DEFAULTS.fontSize;
  const fontFamily = options.fontFamily ?? DEFAULTS.fontFamily;
  const format = options.tickFormat ?? ((v: T) => String(v));

  const horizontal = orientation === 'bottom' || orientation === 'top';
  const sign = orientation === 'bottom' || orientation === 'right' ? 1 : -1;
  const offset = options.offset ?? 0;

  const [r0, r1] = scale.range;
  const tickValues = scale.ticks(options.tickCount);
  const halfBand = scale.bandwidth() / 2;

  const nodes: SceneNode[] = [];

  // Domain line spanning the full range along the primary axis.
  if (horizontal) {
    nodes.push(line({ x1: r0, y1: offset, x2: r1, y2: offset, stroke: color, strokeWidth: 1 }));
  } else {
    nodes.push(line({ x1: offset, y1: r0, x2: offset, y2: r1, stroke: color, strokeWidth: 1 }));
  }

  const labelStyle: TextStyle = {
    fill: labelColor,
    fontSize,
    fontFamily,
    textAlign: horizontal ? 'center' : sign > 0 ? 'left' : 'right',
    textBaseline: horizontal ? (sign > 0 ? 'top' : 'bottom') : 'middle',
  };

  for (const value of tickValues) {
    const pos = scale(value) + halfBand;
    if (!Number.isFinite(pos)) continue;
    const label = format(value);

    if (horizontal) {
      const tickEnd = offset + sign * tickSize;
      const labelPos = offset + sign * (tickSize + tickPadding);
      nodes.push(
        line({ x1: pos, y1: offset, x2: pos, y2: tickEnd, stroke: color, strokeWidth: 1 }),
      );
      nodes.push(text(label, { x: pos, y: labelPos, ...labelStyle }));
    } else {
      const tickEnd = offset + sign * tickSize;
      const labelPos = offset + sign * (tickSize + tickPadding);
      nodes.push(
        line({ x1: offset, y1: pos, x2: tickEnd, y2: pos, stroke: color, strokeWidth: 1 }),
      );
      nodes.push(text(label, { x: labelPos, y: pos, ...labelStyle }));
    }
  }

  return group(nodes, { key: options.key ?? `axis:${orientation}` });
}

/** Convenience wrapper for a bottom (x) axis at the given y offset. */
export function axisBottom<T extends string | number>(
  options: Omit<AxisOptions<T>, 'orientation'>,
): SceneNode {
  return axisMark({ ...options, orientation: 'bottom' });
}

/** Convenience wrapper for a left (y) axis at the given x offset. */
export function axisLeft<T extends string | number>(
  options: Omit<AxisOptions<T>, 'orientation'>,
): SceneNode {
  return axisMark({ ...options, orientation: 'left' });
}
