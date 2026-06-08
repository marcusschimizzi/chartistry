import { area, group, polyline, type SceneNode } from '../scene/nodes';
import type { Point } from '../types';
import type { Scale } from '../scales/types';

export interface LineMarkOptions<D, X extends string | number = number> {
  data: readonly D[];
  /** Map a datum to its x domain value. */
  x: (datum: D, index: number) => X;
  /** Map a datum to its y domain value. */
  y: (datum: D, index: number) => number;
  /** Continuous or band scale; band values are centered on their bandwidth. */
  xScale: Scale<X>;
  yScale: Scale<number>;
  stroke?: string;
  strokeWidth?: number;
  /** Optional fill below the line (area chart). When set, an area is drawn. */
  area?: boolean;
  fill?: string;
  /** Baseline (in y domain units) used for the area fill. Defaults to 0. */
  baseline?: number;
  key?: string;
}

/**
 * A line (or filled area) through a data series. Pure: give it data, accessors,
 * and scales, and it returns a scene node in plot-local coordinates.
 */
export function lineMark<D, X extends string | number = number>(
  options: LineMarkOptions<D, X>,
): SceneNode {
  const { data, x, y, xScale, yScale } = options;
  const stroke = options.stroke ?? '#4f46e5';
  const strokeWidth = options.strokeWidth ?? 2;
  const halfBand = xScale.bandwidth() / 2;

  const points: Point[] = data.map((d, i) => ({
    x: xScale(x(d, i)) + halfBand,
    y: yScale(y(d, i)),
  }));

  const linePath = polyline(points, {
    stroke,
    strokeWidth,
    fill: 'none',
    lineJoin: 'round',
    lineCap: 'round',
    key: options.key ? `${options.key}:line` : undefined,
  });

  if (!options.area || points.length === 0) {
    return linePath;
  }

  // The area shares the line's exact point array (its baseline caps are added
  // by the renderer), so the two stay perfectly coupled when a morph resamples.
  const areaPath = area(points, {
    baseline: yScale(options.baseline ?? 0),
    fill: options.fill ?? withAlpha(stroke, 0.15),
    key: options.key ? `${options.key}:area` : undefined,
  });

  return group([areaPath, linePath], { key: options.key });
}

/** Best-effort alpha blending for hex colors; passthrough for everything else. */
function withAlpha(color: string, alpha: number): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (!hex) return color;
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${hex[1]}${a}`;
}
