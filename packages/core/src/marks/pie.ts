import { arc, group, line, text, type SceneNode } from '../scene/nodes';
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
  /** Original index of the slice to emphasize (e.g. the one under the pointer). */
  activeIndex?: number;
  /** Pixels to pop the active slice outward along its mid-angle. Defaults to 0. */
  activeOffset?: number;
  /** Optional label drawn for each slice. */
  label?: (datum: D, index: number) => string;
  /**
   * Where labels sit: `inside` at the slice centroid (default), or `outside`
   * beyond the arc with a leader line — readable even for thin slices.
   */
  labelPlacement?: 'inside' | 'outside';
  /**
   * Slices whose angular span is below this (radians) are left unlabeled, so
   * tiny wedges don't crowd. Defaults to an adaptive value: roughly the span
   * that fits one line of text at the label radius.
   */
  minLabelAngle?: number;
  /** Label font size in px. Defaults to 12. */
  labelFontSize?: number;
  labelColor?: string;
  /** Leader line color for outside labels. Defaults to a muted slate. */
  leaderColor?: string;
  key?: string;
}

/** Gap in px between the arc's outer edge and an outside label's anchor. */
const LABEL_GAP = 12;

/**
 * A pie or donut: one arc per datum, sized by value. Pure — give it data, a
 * value accessor, and a center/radius, and it returns a scene node. Because arcs
 * are first-class scene primitives, slices tween (grow, shrink, rotate) when the
 * data changes, as long as `id` gives each slice a stable key.
 *
 * Labels sit at each slice's centroid by default, or `outside` the arc with a
 * leader line. Either way, slices too thin to hold a label (below
 * `minLabelAngle`) are skipped so small wedges don't crowd.
 */
export function pieMark<D>(options: PieMarkOptions<D>): SceneNode {
  const { data, value, cx, cy, outerRadius } = options;
  const innerRadius = options.innerRadius ?? 0;
  const palette = options.colors ?? categoricalColors;

  const placement = options.labelPlacement ?? 'inside';
  const fontSize = options.labelFontSize ?? 12;
  const insideRadius = innerRadius > 0 ? (innerRadius + outerRadius) / 2 : outerRadius * 0.6;
  const outsideRadius = outerRadius + LABEL_GAP;
  // Suppress labels on slices narrower than one line of text at the label radius.
  const labelRadius = placement === 'outside' ? outsideRadius : insideRadius;
  const minLabelAngle = options.minLabelAngle ?? fontSize / Math.max(1, labelRadius);
  const labelColor = options.labelColor ?? (placement === 'outside' ? '#334155' : '#ffffff');
  const leaderColor = options.leaderColor ?? '#94a3b8';

  const slices = pie(data, {
    value,
    ...(options.startAngle !== undefined ? { startAngle: options.startAngle } : {}),
    ...(options.endAngle !== undefined ? { endAngle: options.endAngle } : {}),
    ...(options.padAngle !== undefined ? { padAngle: options.padAngle } : {}),
    ...(options.sort ? { sort: options.sort } : {}),
  });

  const activeOffset = options.activeOffset ?? 0;

  const nodes: SceneNode[] = [];
  slices.forEach((slice) => {
    const sliceKey = options.id ? options.id(slice.datum, slice.index) : `slice:${slice.index}`;
    // Pop the active slice outward along its mid-angle (same placement math as
    // arcCentroid), so hover/focus reads as a slight pull-out from the pie.
    const pop = slice.index === options.activeIndex ? activeOffset : 0;
    const ox = pop ? Math.sin(slice.midAngle) * pop : 0;
    const oy = pop ? -Math.cos(slice.midAngle) * pop : 0;
    nodes.push(
      arc({
        cx: cx + ox,
        cy: cy + oy,
        innerRadius,
        outerRadius,
        startAngle: slice.startAngle,
        endAngle: slice.endAngle,
        fill: palette[slice.index % palette.length],
        key: sliceKey,
      }),
    );

    if (!options.label || slice.endAngle - slice.startAngle < minLabelAngle) return;
    const labelText = options.label(slice.datum, slice.index);

    if (placement === 'outside') {
      // Anchor the label just past the arc and run a leader line out to it; the
      // text hangs off the side the slice faces so it never overlaps the pie.
      const dirX = Math.sin(slice.midAngle);
      const dirY = -Math.cos(slice.midAngle);
      const edgeX = cx + ox + dirX * outerRadius;
      const edgeY = cy + oy + dirY * outerRadius;
      const anchorX = cx + ox + dirX * outsideRadius;
      const anchorY = cy + oy + dirY * outsideRadius;
      const onRight = dirX >= 0;
      nodes.push(
        line({
          x1: edgeX,
          y1: edgeY,
          x2: anchorX,
          y2: anchorY,
          stroke: leaderColor,
          strokeWidth: 1,
          key: `${sliceKey}:leader`,
        }),
      );
      nodes.push(
        text(labelText, {
          x: anchorX + (onRight ? 2 : -2),
          y: anchorY,
          fill: labelColor,
          fontSize,
          fontFamily: 'system-ui, sans-serif',
          textAlign: onRight ? 'left' : 'right',
          textBaseline: 'middle',
          key: `${sliceKey}:label`,
        }),
      );
      return;
    }

    const c = arcCentroid(cx + ox, cy + oy, insideRadius, slice.midAngle);
    nodes.push(
      text(labelText, {
        x: c.x,
        y: c.y,
        fill: labelColor,
        fontSize,
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
        textBaseline: 'middle',
        key: `${sliceKey}:label`,
      }),
    );
  });

  return group(nodes, { key: options.key ?? 'pie' });
}
