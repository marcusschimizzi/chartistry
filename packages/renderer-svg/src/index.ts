import type {
  GroupNode,
  Renderer,
  RendererHandle,
  SceneNode,
  Size,
  Style,
  TextNode,
} from '@chartistry/core';

const SVG_NS = 'http://www.w3.org/2000/svg';
const DEFAULT_DURATION = 320;

export interface SvgRendererOptions {
  /** Class added to the root <svg> element, for external styling. */
  className?: string;
  /**
   * Animate changes between frames. Pass `false` to disable, or a config to
   * tune it. Enter fades in, updates tween geometry, exit fades out — all via
   * keyed diffing, so DOM nodes persist across renders.
   */
  transition?: false | { duration?: number; easing?: (t: number) => number };
}

const easeCubicInOut = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * Renders a Chartistry scene graph into real SVG DOM, retaining elements across
 * frames. It matches nodes by `key` (falling back to type + order), reuses the
 * matched DOM, and animates the difference: this is what makes the same chart
 * spec update smoothly — bars regrow, axes reflow — instead of snapping.
 */
export function createSvgRenderer(options: SvgRendererOptions = {}): Renderer {
  const duration =
    options.transition === false ? 0 : (options.transition?.duration ?? DEFAULT_DURATION);
  const easing =
    (options.transition === false ? undefined : options.transition?.easing) ?? easeCubicInOut;

  return {
    name: 'svg',
    mount(container: HTMLElement, size: Size): RendererHandle {
      const svg = document.createElementNS(SVG_NS, 'svg');
      applySize(svg, size);
      svg.style.display = 'block';
      if (options.className) svg.setAttribute('class', options.className);
      container.appendChild(svg);

      const scene = new SvgScene(svg, duration, easing);

      return {
        render: (node: SceneNode) => scene.render(node),
        resize: (next: Size) => applySize(svg, next),
        destroy: () => {
          scene.stop();
          svg.remove();
        },
      };
    },
  };
}

function applySize(svg: SVGElement, size: Size): void {
  svg.setAttribute('width', String(size.width));
  svg.setAttribute('height', String(size.height));
  svg.setAttribute('viewBox', `0 0 ${size.width} ${size.height}`);
}

/* ------------------------------------------------------------------ *
 * Retained node tree + tween engine.
 * ------------------------------------------------------------------ */

interface Anim {
  from: number[];
  to: number[];
  start: number;
  duration: number;
}

interface RNode {
  key: string;
  type: SceneNode['type'];
  el: SVGElement;
  /** Currently displayed numeric geometry (last element is opacity). */
  applied: number[];
  anim: Anim | null;
  /** For polygons vs polylines — a tag change forces recreation. */
  closed: boolean;
  parent: RNode | null;
  children: Map<string, RNode>;
  order: string[];
  exiting: boolean;
}

class SvgScene {
  private root: RNode | null = null;
  private readonly active = new Set<RNode>();
  private frame = 0;
  private readonly canAnimate: boolean;

  constructor(
    private readonly svg: SVGElement,
    private readonly duration: number,
    private readonly easing: (t: number) => number,
  ) {
    this.canAnimate = duration > 0 && typeof requestAnimationFrame === 'function';
  }

  render(node: SceneNode): void {
    this.root = this.reconcile(this.svg, this.root, node, true);
  }

  stop(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.active.clear();
  }

  /** Match `next` against `prev` under `parentEl`, animating the difference. */
  private reconcile(
    parentEl: Element,
    prev: RNode | null,
    next: SceneNode,
    inheritedAnimate: boolean,
  ): RNode {
    const animate = inheritedAnimate && next.animate !== false;

    // A type or polygon/polyline change can't be reconciled in place.
    if (prev && (prev.type !== next.type || prev.closed !== isClosed(next))) {
      this.removeImmediately(prev);
      prev = null;
    }

    if (!prev) return this.enter(parentEl, next, animate);

    applyStatic(prev.el, next);
    const target = geometry(next);
    const reference = prev.anim ? prev.anim.to : prev.applied;

    if (!animate || !this.canAnimate || target.length !== prev.applied.length) {
      prev.anim = null;
      this.active.delete(prev);
      prev.applied = target;
      applyGeometry(prev.el, prev.type, target);
    } else if (!arraysEqual(target, reference)) {
      prev.anim = { from: prev.applied.slice(), to: target, start: now(), duration: this.duration };
      this.schedule(prev);
    }
    prev.exiting = false;

    if (next.type === 'group') {
      this.reconcileChildren(prev, next, animate);
    }
    return prev;
  }

  private enter(parentEl: Element, node: SceneNode, animate: boolean): RNode {
    const el = createElement(node);
    applyStatic(el, node);

    const target = geometry(node);
    const rnode: RNode = {
      key: '',
      type: node.type,
      el,
      applied: target.slice(),
      anim: null,
      closed: isClosed(node),
      parent: null,
      children: new Map(),
      order: [],
      exiting: false,
    };

    if (animate && this.canAnimate) {
      // Geometry lands at its final value immediately; only opacity fades in.
      const from = target.slice();
      from[from.length - 1] = 0;
      rnode.applied = from;
      applyGeometry(el, node.type, from);
      rnode.anim = { from, to: target, start: now(), duration: this.duration };
      this.schedule(rnode);
    } else {
      applyGeometry(el, node.type, target);
    }

    parentEl.appendChild(el);

    if (node.type === 'group') {
      this.reconcileChildren(rnode, node, animate);
    }
    return rnode;
  }

  private reconcileChildren(parent: RNode, node: GroupNode, animate: boolean): void {
    const nextKeys: string[] = [];
    const seen = new Set<string>();
    const typeCounts = new Map<string, number>();

    for (const child of node.children) {
      let key = child.key;
      if (key === undefined) {
        const n = typeCounts.get(child.type) ?? 0;
        typeCounts.set(child.type, n + 1);
        key = `${child.type}~${n}`;
      }
      nextKeys.push(key);
      seen.add(key);

      const childPrev = parent.children.get(key);
      // Skip stale exiting nodes so a re-enter under the same key starts fresh.
      const reusable = childPrev && !childPrev.exiting ? childPrev : null;
      const reconciled = this.reconcile(parent.el, reusable ?? null, child, animate);
      reconciled.key = key;
      reconciled.parent = parent;
      parent.children.set(key, reconciled);
    }

    // Exit anything no longer present.
    for (const [key, child] of parent.children) {
      if (!seen.has(key) && !child.exiting) this.exit(child);
    }

    // Enforce DOM order for the live children (z-order = scene order).
    parent.order = nextKeys;
    for (const key of nextKeys) {
      const child = parent.children.get(key);
      if (child) parent.el.appendChild(child.el);
    }
  }

  private exit(node: RNode): void {
    if (!this.canAnimate) {
      this.removeImmediately(node);
      return;
    }
    node.exiting = true;
    const to = node.applied.slice();
    to[to.length - 1] = 0;
    node.anim = { from: node.applied.slice(), to, start: now(), duration: this.duration };
    this.schedule(node);
  }

  private removeImmediately(node: RNode): void {
    this.active.delete(node);
    node.el.remove();
    if (node.parent) node.parent.children.delete(node.key);
  }

  private schedule(node: RNode): void {
    this.active.add(node);
    if (!this.frame) this.frame = requestAnimationFrame(this.tick);
  }

  private readonly tick = (): void => {
    this.frame = 0;
    const t = now();
    for (const node of this.active) {
      const anim = node.anim;
      if (!anim) {
        this.active.delete(node);
        continue;
      }
      const raw = anim.duration <= 0 ? 1 : (t - anim.start) / anim.duration;
      const done = raw >= 1;
      const e = done ? 1 : this.easing(raw);
      node.applied = done ? anim.to : lerp(anim.from, anim.to, e);
      applyGeometry(node.el, node.type, node.applied);

      if (done) {
        node.anim = null;
        this.active.delete(node);
        if (node.exiting) this.removeImmediately(node);
      }
    }
    if (this.active.size > 0) this.frame = requestAnimationFrame(this.tick);
  };
}

/* ------------------------------------------------------------------ *
 * Per-type geometry (animated) vs static attributes (set directly).
 * The last geometry entry is always opacity, so enter/exit can fade.
 * ------------------------------------------------------------------ */

function geometry(node: SceneNode): number[] {
  switch (node.type) {
    case 'group':
      return [node.x ?? 0, node.y ?? 0, 1];
    case 'line':
      return [node.x1, node.y1, node.x2, node.y2, node.strokeWidth ?? 1, node.opacity ?? 1];
    case 'rect':
      return [
        node.x,
        node.y,
        Math.max(0, node.width),
        Math.max(0, node.height),
        node.rx ?? 0,
        node.opacity ?? 1,
      ];
    case 'circle':
      return [node.cx, node.cy, Math.max(0, node.r), node.strokeWidth ?? 1, node.opacity ?? 1];
    case 'text':
      return [node.x, node.y, node.fontSize ?? 11, node.opacity ?? 1];
    case 'polyline':
      return [node.strokeWidth ?? 1, node.opacity ?? 1, ...node.points.flatMap((p) => [p.x, p.y])];
  }
}

function applyGeometry(el: SVGElement, type: SceneNode['type'], a: number[]): void {
  const opacity = a[a.length - 1] ?? 1;
  switch (type) {
    case 'group': {
      const [x = 0, y = 0] = a;
      if (x || y) el.setAttribute('transform', `translate(${x}, ${y})`);
      else el.removeAttribute('transform');
      setOpacity(el, opacity);
      break;
    }
    case 'line':
      el.setAttribute('x1', String(a[0]));
      el.setAttribute('y1', String(a[1]));
      el.setAttribute('x2', String(a[2]));
      el.setAttribute('y2', String(a[3]));
      el.setAttribute('stroke-width', String(a[4]));
      setOpacity(el, opacity);
      break;
    case 'rect':
      el.setAttribute('x', String(a[0]));
      el.setAttribute('y', String(a[1]));
      el.setAttribute('width', String(a[2]));
      el.setAttribute('height', String(a[3]));
      if (a[4]) el.setAttribute('rx', String(a[4]));
      setOpacity(el, opacity);
      break;
    case 'circle':
      el.setAttribute('cx', String(a[0]));
      el.setAttribute('cy', String(a[1]));
      el.setAttribute('r', String(a[2]));
      el.setAttribute('stroke-width', String(a[3]));
      setOpacity(el, opacity);
      break;
    case 'text':
      el.setAttribute('x', String(a[0]));
      el.setAttribute('y', String(a[1]));
      el.setAttribute('font-size', String(a[2]));
      setOpacity(el, opacity);
      break;
    case 'polyline': {
      el.setAttribute('stroke-width', String(a[0]));
      setOpacity(el, opacity);
      let points = '';
      for (let i = 2; i < a.length; i += 2) points += `${a[i]},${a[i + 1]} `;
      el.setAttribute('points', points.trim());
      break;
    }
  }
}

function applyStatic(el: SVGElement, node: SceneNode): void {
  switch (node.type) {
    case 'group':
      break;
    case 'line':
      applyStroke(el, node, 'none');
      break;
    case 'polyline':
      applyStroke(el, node, 'none');
      break;
    case 'rect':
      applyStroke(el, node);
      break;
    case 'circle':
      applyStroke(el, node);
      break;
    case 'text':
      el.setAttribute('text-anchor', textAnchor(node.textAlign));
      el.setAttribute('dominant-baseline', dominantBaseline(node.textBaseline));
      if (node.fontFamily) el.setAttribute('font-family', node.fontFamily);
      if (node.fontWeight) el.setAttribute('font-weight', String(node.fontWeight));
      el.setAttribute('fill', node.fill ?? '#000');
      if (el.textContent !== node.text) el.textContent = node.text;
      break;
  }
}

function createElement(node: SceneNode): SVGElement {
  switch (node.type) {
    case 'group':
      return el('g');
    case 'line':
      return el('line');
    case 'polyline':
      return el(node.closed ? 'polygon' : 'polyline');
    case 'rect':
      return el('rect');
    case 'circle':
      return el('circle');
    case 'text':
      return el('text');
  }
}

function el(tag: string): SVGElement {
  return document.createElementNS(SVG_NS, tag);
}

function isClosed(node: SceneNode): boolean {
  return node.type === 'polyline' && node.closed === true;
}

function setOpacity(element: SVGElement, opacity: number): void {
  if (opacity >= 1) element.removeAttribute('opacity');
  else element.setAttribute('opacity', String(Math.max(0, opacity)));
}

function applyStroke(element: SVGElement, style: Style, defaultFill = 'none'): void {
  element.setAttribute('fill', style.fill ?? defaultFill);
  if (style.stroke) element.setAttribute('stroke', style.stroke);
  if (style.strokeDash) element.setAttribute('stroke-dasharray', style.strokeDash.join(' '));
  else element.removeAttribute('stroke-dasharray');
  if (style.lineCap) element.setAttribute('stroke-linecap', style.lineCap);
  if (style.lineJoin) element.setAttribute('stroke-linejoin', style.lineJoin);
}

function textAnchor(align: TextNode['textAlign']): string {
  if (align === 'center') return 'middle';
  if (align === 'right') return 'end';
  return 'start';
}

function dominantBaseline(baseline: TextNode['textBaseline']): string {
  if (baseline === 'top') return 'hanging';
  if (baseline === 'bottom') return 'text-after-edge';
  return 'middle';
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

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
