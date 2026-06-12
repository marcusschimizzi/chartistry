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
  /** Band scale over the column categories — the chart's category scale. */
  columnScale: Scale<X>;
  /** Band scale over the row categories. */
  rowScale: Scale<Y>;
  /** When the chart is horizontal, columns run down y and rows across x. */
  horizontal?: boolean;
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
 * A heatmap: one colored cell per (x, y) pair on two band axes. The column scale
 * is the chart's category scale (so cells align with its axis and hit-testing);
 * the row scale is separate. Cells are plain rects, so it paints on SVG and
 * Canvas alike. Value labels (optional) auto-contrast against the cell color.
 */
export function heatmapMark<X extends ScaleValue, Y extends ScaleValue>(
  options: HeatmapMarkOptions<X, Y>,
): SceneNode {
  const pad = options.padding ?? 1;
  const fontSize = options.fontSize ?? 11;
  const colSize = options.columnScale.bandwidth();
  const rowSize = options.rowScale.bandwidth();
  const horizontal = options.horizontal ?? false;

  const nodes: SceneNode[] = [];
  options.cells.forEach((cell, i) => {
    const colPos = options.columnScale(cell.x);
    const rowPos = options.rowScale(cell.y);
    // For a horizontal chart, the column axis is y and the row axis is x.
    const x = (horizontal ? rowPos : colPos) + pad / 2;
    const y = (horizontal ? colPos : rowPos) + pad / 2;
    const w = Math.max(0, (horizontal ? rowSize : colSize) - pad);
    const h = Math.max(0, (horizontal ? colSize : rowSize) - pad);
    const fill = options.color(cell.value);
    nodes.push(rect({ x, y, width: w, height: h, fill, rx: options.radius, key: `cell:${i}` }));
    if (options.label) {
      nodes.push(
        text(options.label(cell.value), {
          x: x + w / 2,
          y: y + h / 2,
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
