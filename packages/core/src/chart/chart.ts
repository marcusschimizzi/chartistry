import { group, type SceneNode } from '../scene/nodes';
import type { Margin, MarginInput, Rect, Size } from '../types';
import { plotArea, resolveMargin } from './layout';

export interface ChartOptions {
  width: number;
  height: number;
  /** Space reserved for axes/labels. Number (all sides) or per-side object. */
  margin?: MarginInput;
}

/**
 * The composition root. A chart resolves layout once, exposes the plot
 * geometry that marks need, and assembles a list of marks into a single scene
 * graph translated into the plot area. It is intentionally tiny and stateless:
 * the "chart" is just glue around the genuinely reusable pieces (scales +
 * marks), which is what keeps the model composable.
 */
export interface Chart {
  readonly size: Size;
  readonly margin: Margin;
  /** The inner drawing region, in chart coordinates. */
  readonly plot: Rect;
  /**
   * Wrap marks (each emitting nodes in plot-local coordinates) into one scene,
   * offset so the plot origin sits at the top-left of the inner region.
   */
  compose(marks: Array<SceneNode | null | undefined>): SceneNode;
}

export function createChart(options: ChartOptions): Chart {
  const size: Size = { width: options.width, height: options.height };
  const margin = resolveMargin(options.margin);
  const plot = plotArea(size, margin);

  return {
    size,
    margin,
    plot,
    compose(marks) {
      const children = marks.filter((m): m is SceneNode => m != null);
      return group(children, { x: plot.x, y: plot.y, key: 'plot' });
    },
  };
}
