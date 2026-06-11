import { circle, group, line, text, type SceneNode } from '../scene/nodes';

export interface SizeLegendEntry {
  /** Circle radius in pixels (from the same size scale the bubbles use). */
  radius: number;
  /** The value label drawn beside the circle. */
  label: string;
}

export interface SizeLegendMarkOptions {
  entries: readonly SizeLegendEntry[];
  /** Top-left corner of the legend's bounding box, in plot-local coordinates. */
  x: number;
  y: number;
  title?: string;
  /** Circle fill. Defaults to `none` (outline only). */
  fill?: string;
  /** Circle outline color. */
  stroke?: string;
  /** Leader-line color. */
  leader?: string;
  textColor?: string;
  fontSize?: number;
  key?: string;
}

/**
 * A bubble-size legend: representative circles nested on a common bottom
 * tangent (largest outermost), each with a leader line to a value label, and an
 * optional title. It's built from radii — not from a scale — so it stays
 * renderer-agnostic and exactly matches whatever size scale produced them.
 */
export function sizeLegendMark(options: SizeLegendMarkOptions): SceneNode {
  const fontSize = options.fontSize ?? 11;
  const stroke = options.stroke ?? '#94a3b8';
  const fill = options.fill ?? 'none';
  const leader = options.leader ?? '#cbd5e1';
  const textColor = options.textColor ?? '#475569';

  // Largest first, so the smaller circles nest inside the largest.
  const entries = [...options.entries].sort((a, b) => b.radius - a.radius);
  const maxRadius = entries[0]?.radius ?? 0;
  const titleHeight = options.title ? fontSize + 6 : 0;
  const centerX = options.x + maxRadius;
  const baseline = options.y + titleHeight + 2 * maxRadius;
  const labelX = options.x + 2 * maxRadius + 8;

  const nodes: SceneNode[] = [];
  if (options.title) {
    nodes.push(
      text(options.title, {
        x: options.x,
        y: options.y,
        fontSize,
        fontWeight: 600,
        fill: textColor,
        textAlign: 'left',
        textBaseline: 'top',
        key: 'title',
      }),
    );
  }
  entries.forEach((entry, i) => {
    const topY = baseline - 2 * entry.radius;
    nodes.push(
      circle({
        cx: centerX,
        cy: baseline - entry.radius,
        r: entry.radius,
        fill,
        stroke,
        strokeWidth: 1,
        key: `circle:${i}`,
      }),
    );
    nodes.push(
      line({
        x1: centerX,
        y1: topY,
        x2: labelX - 4,
        y2: topY,
        stroke: leader,
        strokeWidth: 1,
        key: `leader:${i}`,
      }),
    );
    nodes.push(
      text(entry.label, {
        x: labelX,
        y: topY,
        fontSize,
        fill: textColor,
        textAlign: 'left',
        textBaseline: 'middle',
        key: `label:${i}`,
      }),
    );
  });

  // animate:false — the legend is reference furniture, not data to tween.
  return group(nodes, { key: options.key, animate: false });
}
