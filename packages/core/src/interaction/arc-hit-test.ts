/**
 * Angular hit-testing for pie/donut slices. Like the rest of the interaction
 * module, this is pure geometry over numbers — no DOM, no scene nodes — so it
 * resolves the slice under a pointer identically on SVG and Canvas. Angles use
 * the same convention as the `arc` scene node: radians clockwise from 12
 * o'clock.
 */

const TAU = Math.PI * 2;

/** The angular span of one slice, matching {@link PieSlice}'s start/end. */
export interface ArcSlice {
  startAngle: number;
  endAngle: number;
}

export interface ArcHitTestOptions {
  /** Center of the pie, in the same space as the test point. */
  cx: number;
  cy: number;
  /** Inner radius (0 for a solid pie); points nearer than this miss. */
  innerRadius: number;
  /** Outer radius; points farther than this miss. */
  outerRadius: number;
  /** Extra pixels of slack on the radius band, so edges stay easy to hit. */
  radiusTolerance?: number;
}

/**
 * Angle of (x, y) about (cx, cy): radians clockwise from 12 o'clock, in [0, 2π).
 * The inverse of the arc node's placement, where a point at angle θ and radius r
 * sits at (cx + r·sinθ, cy − r·cosθ).
 */
export function angleFromCenter(x: number, y: number, cx: number, cy: number): number {
  const angle = Math.atan2(x - cx, -(y - cy));
  return angle < 0 ? angle + TAU : angle;
}

/**
 * Index of the slice covering point (x, y), or -1 when none does. The point must
 * fall inside [innerRadius, outerRadius] and within a slice's angular span, so
 * gaps between slices (padAngle) and points off the ring correctly miss — pie
 * hover is exact rather than nearest-wins. When slices touch, the lower index
 * wins the shared boundary.
 */
export function arcHitTest(
  x: number,
  y: number,
  slices: readonly ArcSlice[],
  options: ArcHitTestOptions,
): number {
  const { cx, cy, innerRadius, outerRadius } = options;
  const tolerance = options.radiusTolerance ?? 0;
  const dx = x - cx;
  const dy = y - cy;
  const radius = Math.sqrt(dx * dx + dy * dy);
  const lo = Math.min(innerRadius, outerRadius) - tolerance;
  const hi = Math.max(innerRadius, outerRadius) + tolerance;
  if (radius < lo || radius > hi) return -1;

  const angle = angleFromCenter(x, y, cx, cy);
  for (let i = 0; i < slices.length; i++) {
    const slice = slices[i];
    if (slice && angleWithinSlice(angle, slice.startAngle, slice.endAngle)) return i;
  }
  return -1;
}

/** True when `angle` (in [0, 2π)) lies within the arc [start, end], modulo a turn. */
function angleWithinSlice(angle: number, startAngle: number, endAngle: number): boolean {
  const sweep = endAngle - startAngle;
  if (sweep <= 0) return false;
  if (sweep >= TAU) return true;
  let delta = (angle - startAngle) % TAU;
  if (delta < 0) delta += TAU;
  return delta <= sweep;
}
