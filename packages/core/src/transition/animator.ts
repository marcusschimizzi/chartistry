import type { GroupNode, SceneNode } from '../scene/nodes';
import type { Point } from '../types';
import { flatten, isClosed, withGeometry } from './geometry';
import { resamplePoints } from './resample';

/** Cubic ease-in-out — the default transition curve. */
export const easeCubicInOut = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export interface AnimatorOptions {
  /** Transition length in ms. `0` disables animation (commits land instantly). */
  duration: number;
  easing?: (t: number) => number;
  /** Called with the interpolated scene to paint — every frame while animating. */
  onFrame: (scene: SceneNode) => void;
  /** Time source (ms). Injectable for tests. */
  now?: () => number;
  /** Frame scheduler. Injectable for tests; defaults to requestAnimationFrame. */
  requestFrame?: (callback: () => void) => number;
  cancelFrame?: (id: number) => void;
}

export interface Animator {
  /** Diff `scene` against the last commit and animate the difference. */
  commit(scene: SceneNode): void;
  /** Cancel any in-flight animation and forget the retained tree. */
  stop(): void;
}

interface Anim {
  from: number[];
  to: number[];
  start: number;
  duration: number;
}

interface RNode {
  key: string;
  type: SceneNode['type'];
  /** Latest committed node, source of static props (color, text, ...). */
  base: SceneNode;
  /** Current interpolated geometry (last entry is opacity). */
  current: number[];
  anim: Anim | null;
  /** Exact geometry to snap to when a resampled (morph) tween finishes. */
  settleTo: number[] | null;
  children: Map<string, RNode>;
  order: string[];
  parent: RNode | null;
  exiting: boolean;
  closed: boolean;
}

const ROOT_KEY = '__root__';

/**
 * A backend-agnostic transition engine. It keeps a retained, keyed mirror of
 * the scene; on each `commit` it classifies nodes as enter / update / exit and
 * sets up tweens, then emits interpolated scenes through `onFrame` until they
 * settle. It knows nothing about SVG, Canvas, or the DOM — renderers just paint
 * whatever scene it hands them, which is what lets every backend animate alike.
 */
export function createAnimator(options: AnimatorOptions): Animator {
  const easing = options.easing ?? easeCubicInOut;
  const now =
    options.now ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  const raf =
    options.requestFrame ??
    (typeof requestAnimationFrame === 'function'
      ? (cb: () => void) => requestAnimationFrame(cb)
      : null);
  const caf =
    options.cancelFrame ??
    (typeof cancelAnimationFrame === 'function'
      ? (id: number) => cancelAnimationFrame(id)
      : () => {});
  const duration = options.duration;
  const canAnimate = duration > 0 && raf != null;

  let root: RNode | null = null;
  const active = new Set<RNode>();
  let frame = 0;

  function enter(next: SceneNode, inheritedAnimate: boolean, fade: boolean): RNode {
    const animate = inheritedAnimate && next.animate !== false;
    const target = flatten(next);
    const node: RNode = {
      key: '',
      type: next.type,
      base: next,
      current: target.slice(),
      anim: null,
      settleTo: null,
      children: new Map(),
      order: [],
      parent: null,
      exiting: false,
      closed: isClosed(next),
    };

    if (canAnimate && animate && fade) {
      // Only the outermost new node fades; descendants ride its group opacity,
      // so a subtree fades in once rather than compounding at every level.
      const from = target.slice();
      from[from.length - 1] = 0;
      node.current = from;
      node.anim = { from, to: target, start: now(), duration };
      active.add(node);
    }

    if (next.type === 'group') reconcileChildren(node, next, animate, false);
    return node;
  }

  function update(node: RNode, next: SceneNode, inheritedAnimate: boolean): RNode {
    const animate = inheritedAnimate && next.animate !== false;

    // A type or polygon/polyline change can't be reconciled in place.
    if (node.type !== next.type || node.closed !== isClosed(next)) {
      detach(node);
      return enter(next, inheritedAnimate, true);
    }

    node.base = next;
    node.exiting = false;
    const target = flatten(next);
    const reference = node.anim ? node.anim.to : node.current;
    const lengthChanged = target.length !== node.current.length;

    if (!canAnimate || !animate) {
      node.anim = null;
      node.settleTo = null;
      active.delete(node);
      node.current = target;
    } else if ((next.type === 'polyline' || next.type === 'area') && lengthChanged) {
      // The point count changed: resample both paths to a shared resolution so
      // they can be lerped point-wise, then snap to the exact target on finish.
      const n = Math.max(polylinePointCount(node.current), polylinePointCount(target));
      const from = resamplePolyline(node.current, n);
      const to = resamplePolyline(target, n);
      if (node.anim && arraysEqual(node.anim.to, to)) {
        // Already morphing toward this shape — let it continue.
      } else if (arraysEqual(from, to)) {
        node.anim = null;
        node.settleTo = null;
        active.delete(node);
        node.current = target;
      } else {
        node.current = from;
        node.anim = { from, to, start: now(), duration };
        node.settleTo = target;
        active.add(node);
      }
    } else if (lengthChanged) {
      // Mismatched lengths we can't morph (non-polyline) — just snap.
      node.anim = null;
      node.settleTo = null;
      active.delete(node);
      node.current = target;
    } else if (!arraysEqual(target, reference)) {
      node.anim = { from: node.current.slice(), to: target, start: now(), duration };
      node.settleTo = null;
      active.add(node);
    }

    if (next.type === 'group') reconcileChildren(node, next, animate, true);
    return node;
  }

  function reconcileChildren(
    parent: RNode,
    next: GroupNode,
    animate: boolean,
    childFade: boolean,
  ): void {
    const seen = new Set<string>();
    const order: string[] = [];
    const counts = new Map<string, number>();

    for (const child of next.children) {
      let key = child.key;
      if (key === undefined) {
        const n = counts.get(child.type) ?? 0;
        counts.set(child.type, n + 1);
        key = `${child.type}~${n}`;
      }
      order.push(key);
      seen.add(key);

      const prev = parent.children.get(key);
      const reusable = prev && !prev.exiting ? prev : null;
      const reconciled = reusable
        ? update(reusable, child, animate)
        : enter(child, animate, childFade);
      reconciled.key = key;
      reconciled.parent = parent;
      parent.children.set(key, reconciled);
    }

    // Exit anything gone; keep it in the tree (and draw order) until it fades.
    const exitingKeys: string[] = [];
    for (const [key, child] of parent.children) {
      if (!seen.has(key)) {
        if (!child.exiting) exit(child);
        if (parent.children.has(key)) exitingKeys.push(key);
      }
    }
    parent.order = [...order, ...exitingKeys];
  }

  function exit(node: RNode): void {
    if (!canAnimate) {
      detach(node);
      return;
    }
    node.exiting = true;
    const to = node.current.slice();
    to[to.length - 1] = 0;
    node.anim = { from: node.current.slice(), to, start: now(), duration };
    active.add(node);
  }

  function detach(node: RNode): void {
    active.delete(node);
    const parent = node.parent;
    // Only unlink if the parent still points here: a node with the same key may
    // have re-entered while this one was exiting, and it must not be clobbered.
    if (parent && parent.children.get(node.key) === node) {
      parent.children.delete(node.key);
      parent.order = parent.order.filter((k) => k !== node.key);
    }
  }

  function emit(node: RNode): SceneNode {
    if (node.type === 'group') {
      const children: SceneNode[] = [];
      for (const key of node.order) {
        const child = node.children.get(key);
        if (child) children.push(emit(child));
      }
      const built = withGeometry(node.base, node.current, children);
      built.key = node.key;
      return built;
    }
    const built = withGeometry(node.base, node.current);
    built.key = node.key;
    return built;
  }

  function tick(): void {
    frame = 0;
    const t = now();
    const finished: RNode[] = [];

    for (const node of active) {
      const anim = node.anim;
      if (!anim) {
        finished.push(node);
        continue;
      }
      const raw = anim.duration <= 0 ? 1 : (t - anim.start) / anim.duration;
      if (raw >= 1) {
        // Morph tweens settle on the exact target, not the resampled endpoint.
        node.current = node.settleTo ?? anim.to;
        node.settleTo = null;
        node.anim = null;
        finished.push(node);
      } else {
        node.current = lerp(anim.from, anim.to, easing(raw));
      }
    }

    for (const node of finished) {
      active.delete(node);
      if (node.exiting) detach(node);
    }

    if (root) options.onFrame(emit(root));
    if (active.size > 0) schedule();
  }

  function schedule(): void {
    if (!frame && raf) frame = raf(tick);
  }

  return {
    commit(scene: SceneNode): void {
      root = root ? update(root, scene, true) : enter(scene, true, true);
      root.key = ROOT_KEY;
      options.onFrame(emit(root));
      if (active.size > 0) schedule();
    },
    stop(): void {
      if (frame) caf(frame);
      frame = 0;
      active.clear();
      root = null;
    },
  };
}

function lerp(from: number[], to: number[], t: number): number[] {
  const out = new Array<number>(from.length);
  for (let i = 0; i < from.length; i++) {
    const a = from[i] ?? 0;
    const b = to[i] ?? a;
    out[i] = a + (b - a) * t;
  }
  return out;
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * A flattened polyline is `[strokeWidth, opacity, x0, y0, x1, y1, ...]`.
 * These helpers resample just the point part, preserving the scalar prefix.
 */
function polylinePointCount(flat: number[]): number {
  return Math.max(0, (flat.length - 2) >> 1);
}

function resamplePolyline(flat: number[], count: number): number[] {
  const points: Point[] = [];
  for (let i = 2; i < flat.length; i += 2) points.push({ x: flat[i] ?? 0, y: flat[i + 1] ?? 0 });
  const resampled = resamplePoints(points, count);
  const out: number[] = [flat[0] ?? 1, flat[1] ?? 1];
  for (const p of resampled) out.push(p.x, p.y);
  return out;
}
