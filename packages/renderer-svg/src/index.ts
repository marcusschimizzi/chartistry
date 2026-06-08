import {
  createAnimator,
  type GroupNode,
  type Renderer,
  type RendererHandle,
  type SceneNode,
  type Size,
  type Style,
  type TextNode,
} from '@chartistry/core';

const SVG_NS = 'http://www.w3.org/2000/svg';
const DEFAULT_DURATION = 320;

export interface SvgRendererOptions {
  /** Class added to the root <svg> element, for external styling. */
  className?: string;
  /**
   * Animate changes between frames. Pass `false` to disable, or a config to
   * tune it. The renderer retains elements by `key` and the core animator tweens
   * the geometry, so updates ease (bars regrow, axes reflow) instead of snapping.
   */
  transition?: false | { duration?: number; easing?: (t: number) => number };
}

/**
 * Renders a Chartistry scene graph into real SVG DOM. The core animator owns the
 * tween math and feeds this renderer interpolated scenes; the renderer's only
 * job is to make the DOM match each one, reusing elements by `key`. Keeping
 * elements stable across frames preserves CSS state and avoids churn.
 */
export function createSvgRenderer(options: SvgRendererOptions = {}): Renderer {
  const duration =
    options.transition === false ? 0 : (options.transition?.duration ?? DEFAULT_DURATION);
  const easing = options.transition === false ? undefined : options.transition?.easing;

  return {
    name: 'svg',
    mount(container: HTMLElement, size: Size): RendererHandle {
      const svg = document.createElementNS(SVG_NS, 'svg');
      applySize(svg, size);
      svg.style.display = 'block';
      if (options.className) svg.setAttribute('class', options.className);
      container.appendChild(svg);

      const patcher = new SvgPatcher(svg);
      const animator = createAnimator({
        duration,
        ...(easing ? { easing } : {}),
        onFrame: (scene) => patcher.patch(scene),
      });

      return {
        render: (node: SceneNode) => animator.commit(node),
        resize: (next: Size) => applySize(svg, next),
        destroy: () => {
          animator.stop();
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
 * Keyed DOM patcher: make the DOM match a (pre-interpolated) scene.
 * ------------------------------------------------------------------ */

interface PNode {
  type: SceneNode['type'];
  el: SVGElement;
  closed: boolean;
  children: Map<string, PNode>;
}

class SvgPatcher {
  private root: PNode | null = null;
  constructor(private readonly svg: SVGElement) {}

  patch(scene: SceneNode): void {
    this.root = this.reconcile(this.svg, this.root, scene);
  }

  private reconcile(parentEl: Element, prev: PNode | null, node: SceneNode): PNode {
    let pnode = prev;
    if (!pnode || pnode.type !== node.type || pnode.closed !== isClosed(node)) {
      pnode?.el.remove();
      const el = createElement(node);
      parentEl.appendChild(el);
      pnode = { type: node.type, el, closed: isClosed(node), children: new Map() };
    }

    applyAttributes(pnode.el, node);

    if (node.type === 'group') this.reconcileChildren(pnode, node);
    return pnode;
  }

  private reconcileChildren(parent: PNode, node: GroupNode): void {
    const seen = new Set<string>();
    const counts = new Map<string, number>();
    const order: string[] = [];

    for (const child of node.children) {
      const key = child.key ?? `${child.type}~${countOf(counts, child.type)}`;
      order.push(key);
      seen.add(key);
      const reconciled = this.reconcile(parent.el, parent.children.get(key) ?? null, child);
      parent.children.set(key, reconciled);
    }

    for (const [key, child] of parent.children) {
      if (!seen.has(key)) {
        child.el.remove();
        parent.children.delete(key);
      }
    }

    // Enforce DOM order so z-order matches the scene.
    for (const key of order) {
      const child = parent.children.get(key);
      if (child) parent.el.appendChild(child.el);
    }
  }
}

function countOf(counts: Map<string, number>, type: string): number {
  const n = counts.get(type) ?? 0;
  counts.set(type, n + 1);
  return n;
}

function applyAttributes(el: SVGElement, node: SceneNode): void {
  switch (node.type) {
    case 'group':
      if (node.x || node.y)
        el.setAttribute('transform', `translate(${node.x ?? 0}, ${node.y ?? 0})`);
      else el.removeAttribute('transform');
      setOpacity(el, node.opacity ?? 1);
      break;
    case 'line':
      el.setAttribute('x1', String(node.x1));
      el.setAttribute('y1', String(node.y1));
      el.setAttribute('x2', String(node.x2));
      el.setAttribute('y2', String(node.y2));
      applyStroke(el, node, 'none');
      setOpacity(el, node.opacity ?? 1);
      break;
    case 'polyline':
      el.setAttribute('points', node.points.map((p) => `${p.x},${p.y}`).join(' '));
      applyStroke(el, node, 'none');
      setOpacity(el, node.opacity ?? 1);
      break;
    case 'rect':
      el.setAttribute('x', String(node.x));
      el.setAttribute('y', String(node.y));
      el.setAttribute('width', String(Math.max(0, node.width)));
      el.setAttribute('height', String(Math.max(0, node.height)));
      if (node.rx) el.setAttribute('rx', String(node.rx));
      applyStroke(el, node);
      setOpacity(el, node.opacity ?? 1);
      break;
    case 'circle':
      el.setAttribute('cx', String(node.cx));
      el.setAttribute('cy', String(node.cy));
      el.setAttribute('r', String(Math.max(0, node.r)));
      applyStroke(el, node);
      setOpacity(el, node.opacity ?? 1);
      break;
    case 'text':
      el.setAttribute('x', String(node.x));
      el.setAttribute('y', String(node.y));
      el.setAttribute('text-anchor', textAnchor(node.textAlign));
      el.setAttribute('dominant-baseline', dominantBaseline(node.textBaseline));
      if (node.fontSize) el.setAttribute('font-size', String(node.fontSize));
      if (node.fontFamily) el.setAttribute('font-family', node.fontFamily);
      if (node.fontWeight) el.setAttribute('font-weight', String(node.fontWeight));
      el.setAttribute('fill', node.fill ?? '#000');
      setOpacity(el, node.opacity ?? 1);
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
  else element.removeAttribute('stroke');
  if (style.strokeWidth != null) element.setAttribute('stroke-width', String(style.strokeWidth));
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
