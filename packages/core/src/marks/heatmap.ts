import { group, rect, text, type SceneNode } from '../scene/nodes';
import { contrastColor } from '../scales/sequential';
import type { Scale, ScaleValue } from '../scales/types';

export interface HeatmapCell<X extends ScaleValue, Y extends ScaleValue> {
  x: X;
  y: Y;
  value: number;
}

export interface HeatmapMarkOptions<X extends ScaleValue, Y extends ScaleValue> {
  cells: ReadonlyArray<HeatmapCell<X, Y>>;
  /** Band scale over the x categories. */
  xScale: Scale<X>;
  /** Band scale over the y categories. */
  yScale: Scale<Y>;
  /** Map a cell value to a fill color. */
  color: (value: number) => string;
  /** Gap between cells, in pixels. */
  padding?: number;
  /** Cell corner radius. */
  radius?: number;
  /** When set, draw each cell's value via this formatter. */
  label?: (value: number) => string;
  /** Override the auto-contrast label color. */
  labelColor?: string;
  fontSize?: number;
  key?: string;
}

/**
 * A heatmap: one colored cell per (x, y) pair on two band axes. Cells are plain
 * rects, so it paints on SVG and Canvas alike. Value labels (optional) default
 * to an auto-contrasting color so they stay legible on light and dark cells.
 */
export function heatmapMark<X extends ScaleValue, Y extends ScaleValue>(
  options: HeatmapMarkOptions<X, Y>,
): SceneNode {
  const pad = options.padding ?? 1;
  const fontSize = options.fontSize ?? 11;
  const w = options.xScale.bandwidth();
  const h = options.yScale.bandwidth();
  const cw = Math.max(0, w - pad);
  const ch = Math.max(0, h - pad);

  const nodes: SceneNode[] = [];
  options.cells.forEach((cell, i) => {
    const x = options.xScale(cell.x) + pad / 2;
    const y = options.yScale(cell.y) + pad / 2;
    const fill = options.color(cell.value);
    nodes.push(rect({ x, y, width: cw, height: ch, fill, rx: options.radius, key: `cell:${i}` }));
    if (options.label) {
      nodes.push(
        text(options.label(cell.value), {
          x: x + cw / 2,
          y: y + ch / 2,
          textAlign: 'center',
          textBaseline: 'middle',
          fill: options.labelColor ?? contrastColor(fill),
          fontSize,
          key: `label:${i}`,
        }),
      );
    }
  });

  return group(nodes, { key: options.key, animate: false });
}
