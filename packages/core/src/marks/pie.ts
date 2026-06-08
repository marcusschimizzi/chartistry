import { arc, group, text, type SceneNode } from '../scene/nodes';
import { arcCentroid, pie, type PieOptions } from '../data/pie';
import { categoricalColors } from '../scales/ordinal';

export interface PieMarkOptions<D> {
  data: readonly D[];
  value: (datum: D, index: number) => number;
  cx: number;
  cy: number;
  outerRadius: number;
  /** Inner radius; > 0 makes a donut. Defaults to 0 (solid pie). */
  innerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  padAngle?: number;
  sort?: PieOptions<D>['sort'];
  /** Palette for slices. */
  colors?: readonly string[];
  /** Stable key per slice, so slices tween across data changes. */
  id?: (datum: D, index: number) => string;
  /** Optional label drawn at each slice's centroid. */
  label?: (datum: D, index: number) => string;
  labelColor?: string;
  key?: string;
}

/**
 * A pie or donut: one arc per datum, sized by value. Pure — give it data, a
 * value accessor, and a center/radius, and it returns a scene node. Because arcs
 * are first-class scene primitives, slices tween (grow, shrink, rotate) when the
 * data changes, as long as `id` gives each slice a stable key.
 */
export function pieMark<D>(options: PieMarkOptions<D>): SceneNode {
  const { data, value, cx, cy, outerRadius } = options;
  const innerRadius = options.innerRadius ?? 0;
  const palette = options.colors ?? categoricalColors;
  const labelRadius = innerRadius > 0 ? (innerRadius + outerRadius) / 2 : outerRadius * 0.6;

  const slices = pie(data, {
    value,
    ...(options.startAngle !== undefined ? { startAngle: options.startAngle } : {}),
    ...(options.endAngle !== undefined ? { endAngle: options.endAngle } : {}),
    ...(options.padAngle !== undefined ? { padAngle: options.padAngle } : {}),
    ...(options.sort ? { sort: options.sort } : {}),
  });

  const nodes: SceneNode[] = [];
  slices.forEach((slice) => {
    const sliceKey = options.id ? options.id(slice.datum, slice.index) : `slice:${slice.index}`;
    nodes.push(
      arc({
        cx,
        cy,
        innerRadius,
        outerRadius,
        startAngle: slice.startAngle,
        endAngle: slice.endAngle,
        fill: palette[slice.index % palette.length],
        key: sliceKey,
      }),
    );
    if (options.label && slice.endAngle - slice.startAngle > 0.05) {
      const c = arcCentroid(cx, cy, labelRadius, slice.midAngle);
      nodes.push(
        text(options.label(slice.datum, slice.index), {
          x: c.x,
          y: c.y,
          fill: options.labelColor ?? '#ffffff',
          fontSize: 12,
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          textBaseline: 'middle',
          key: `${sliceKey}:label`,
        }),
      );
    }
  });

  return group(nodes, { key: options.key ?? 'pie' });
}
