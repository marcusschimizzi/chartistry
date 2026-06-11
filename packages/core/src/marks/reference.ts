import { circle, group, line, rect, text, type SceneNode } from '../scene/nodes';

/** A text label placed at a point, with explicit alignment. */
export interface MarkLabel {
  text: string;
  x: number;
  y: number;
  align?: 'left' | 'center' | 'right';
  baseline?: 'top' | 'middle' | 'bottom';
  color?: string;
  fontSize?: number;
  fontWeight?: number | string;
}

function labelNode(label: MarkLabel, fallbackColor: string): SceneNode {
  return text(label.text, {
    x: label.x,
    y: label.y,
    fill: label.color ?? fallbackColor,
    fontSize: label.fontSize ?? 11,
    fontWeight: label.fontWeight,
    textAlign: label.align ?? 'left',
    textBaseline: label.baseline ?? 'middle',
    key: 'label',
  });
}

export interface ReferenceLineMarkOptions {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: MarkLabel;
  color?: string;
  strokeWidth?: number;
  strokeDash?: number[];
  key?: string;
}

/** A straight reference line across the plot, with an optional label. */
export function referenceLineMark(options: ReferenceLineMarkOptions): SceneNode {
  const color = options.color ?? '#64748b';
  const nodes: SceneNode[] = [
    line({
      x1: options.x1,
      y1: options.y1,
      x2: options.x2,
      y2: options.y2,
      stroke: color,
      strokeWidth: options.strokeWidth ?? 1,
      strokeDash: options.strokeDash ?? [4, 4],
      key: 'line',
    }),
  ];
  if (options.label) nodes.push(labelNode(options.label, color));
  return group(nodes, { key: options.key, animate: false });
}

export interface ReferenceBandMarkOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: MarkLabel;
  fill?: string;
  opacity?: number;
  key?: string;
}

/** A shaded reference band (a rectangle), with an optional label. */
export function referenceBandMark(options: ReferenceBandMarkOptions): SceneNode {
  const fill = options.fill ?? '#64748b';
  const nodes: SceneNode[] = [
    rect({
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      fill,
      opacity: options.opacity ?? 0.12,
      key: 'band',
    }),
  ];
  if (options.label) nodes.push(labelNode(options.label, '#475569'));
  return group(nodes, { key: options.key, animate: false });
}

export interface AnnotationMarkOptions {
  /** The data point being annotated, in pixels. */
  x: number;
  y: number;
  /** Callout offset from the point; the label sits at (x+dx, y+dy). */
  dx: number;
  dy: number;
  label: MarkLabel;
  color?: string;
  /** Marker radius; 0 to omit the marker dot. */
  radius?: number;
  key?: string;
}

/** A point callout: a marker dot, a connector to an offset, and a label. */
export function annotationMark(options: AnnotationMarkOptions): SceneNode {
  const color = options.color ?? '#475569';
  const radius = options.radius ?? 3;
  const tipX = options.x + options.dx;
  const tipY = options.y + options.dy;
  const nodes: SceneNode[] = [
    line({ x1: options.x, y1: options.y, x2: tipX, y2: tipY, stroke: color, strokeWidth: 1, key: 'leader' }),
  ];
  if (radius > 0) {
    nodes.push(circle({ cx: options.x, cy: options.y, r: radius, fill: color, key: 'marker' }));
  }
  nodes.push(labelNode(options.label, color));
  return group(nodes, { key: options.key, animate: false });
}
