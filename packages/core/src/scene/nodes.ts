import type { Point } from '../types';

/**
 * The scene graph is the renderer-agnostic intermediate representation that
 * sits between the chart logic and any concrete renderer. Marks and axes emit
 * scene nodes; a {@link Renderer} walks the tree and paints it however it likes
 * (SVG DOM, a canvas context, WebGL, a test serializer, ...).
 *
 * Keeping this representation small and declarative is what lets the same chart
 * spec render identically through completely different backends.
 */

/** Visual styling shared by drawable nodes. Units are CSS-like. */
export interface Style {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  /** Dash pattern, e.g. `[4, 4]`. */
  strokeDash?: number[];
  opacity?: number;
  /** Line cap for strokes. */
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
}

/** Text-specific styling. */
export interface TextStyle extends Style {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number | string;
  /** Horizontal anchor of the text relative to its (x, y). */
  textAlign?: 'left' | 'center' | 'right';
  /** Vertical anchor of the text relative to its (x, y). */
  textBaseline?: 'top' | 'middle' | 'bottom';
}

interface NodeBase {
  /** Optional stable identity, used by renderers that diff between frames. */
  key?: string;
}

/** A container that translates its children by (x, y). */
export interface GroupNode extends NodeBase {
  type: 'group';
  x?: number;
  y?: number;
  children: SceneNode[];
}

export interface LineNode extends NodeBase, Style {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** An open or closed sequence of connected points. */
export interface PolylineNode extends NodeBase, Style {
  type: 'polyline';
  points: Point[];
  closed?: boolean;
}

export interface RectNode extends NodeBase, Style {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  /** Corner radius. */
  rx?: number;
}

export interface CircleNode extends NodeBase, Style {
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
}

export interface TextNode extends NodeBase, TextStyle {
  type: 'text';
  x: number;
  y: number;
  text: string;
}

export type SceneNode = GroupNode | LineNode | PolylineNode | RectNode | CircleNode | TextNode;

/* ------------------------------------------------------------------ *
 * Constructor helpers — terser and safer than building object literals.
 * ------------------------------------------------------------------ */

export function group(
  children: SceneNode[],
  opts: Omit<GroupNode, 'type' | 'children'> = {},
): GroupNode {
  return { type: 'group', children, ...opts };
}

export function line(props: Omit<LineNode, 'type'>): LineNode {
  return { type: 'line', ...props };
}

export function polyline(
  points: Point[],
  style: Omit<PolylineNode, 'type' | 'points'> = {},
): PolylineNode {
  return { type: 'polyline', points, ...style };
}

export function rect(props: Omit<RectNode, 'type'>): RectNode {
  return { type: 'rect', ...props };
}

export function circle(props: Omit<CircleNode, 'type'>): CircleNode {
  return { type: 'circle', ...props };
}

export function text(value: string, props: Omit<TextNode, 'type' | 'text'>): TextNode {
  return { type: 'text', text: value, ...props };
}
