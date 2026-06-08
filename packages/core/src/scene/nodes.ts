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
  /**
   * Renderer hint: set `false` to opt this node (and its subtree) out of
   * enter/update/exit transitions. Use it for pointer-driven marks like the
   * crosshair, which should track the cursor instantly rather than ease.
   */
  animate?: boolean;
}

/** A container that translates its children by (x, y). */
export interface GroupNode extends NodeBase {
  type: 'group';
  x?: number;
  y?: number;
  /** Group-wide opacity, multiplied into descendants. Used for subtree fades. */
  opacity?: number;
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

/**
 * A filled region between a sequence of points and a horizontal `baseline`.
 * Unlike a closed polyline, the baseline caps are reconstructed by the renderer
 * from `points`, so an area shares the exact same point array as its companion
 * line — which keeps the two perfectly coupled when a transition morphs them.
 */
export interface AreaNode extends NodeBase, Style {
  type: 'area';
  points: Point[];
  /** Y value (in the same space as `points`) to fill down to. */
  baseline: number;
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

/**
 * An annular sector (pie slice / donut segment). Angles are in radians measured
 * clockwise from 12 o'clock. `innerRadius` of 0 makes a solid pie slice.
 */
export interface ArcNode extends NodeBase, Style {
  type: 'arc';
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
}

export interface TextNode extends NodeBase, TextStyle {
  type: 'text';
  x: number;
  y: number;
  text: string;
}

export type SceneNode =
  | GroupNode
  | LineNode
  | PolylineNode
  | AreaNode
  | RectNode
  | CircleNode
  | ArcNode
  | TextNode;

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

export function area(points: Point[], props: Omit<AreaNode, 'type' | 'points'>): AreaNode {
  return { type: 'area', points, ...props };
}

export function rect(props: Omit<RectNode, 'type'>): RectNode {
  return { type: 'rect', ...props };
}

export function circle(props: Omit<CircleNode, 'type'>): CircleNode {
  return { type: 'circle', ...props };
}

export function arc(props: Omit<ArcNode, 'type'>): ArcNode {
  return { type: 'arc', ...props };
}

export function text(value: string, props: Omit<TextNode, 'type' | 'text'>): TextNode {
  return { type: 'text', text: value, ...props };
}
