import type {
  CircleNode,
  GroupNode,
  LineNode,
  PolylineNode,
  RectNode,
  Renderer,
  RendererHandle,
  SceneNode,
  Size,
  Style,
  TextNode,
} from '@chartistry/core';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface SvgRendererOptions {
  /** Class added to the root <svg> element, for external styling. */
  className?: string;
}

/**
 * Renders a Chartistry scene graph into real SVG DOM. SVG is a retained,
 * inspectable, CSS-styleable target — the natural default backend. For now each
 * frame rebuilds the subtree (simple and correct); keyed diffing can layer on
 * later behind the same handle.
 */
export function createSvgRenderer(options: SvgRendererOptions = {}): Renderer {
  return {
    name: 'svg',
    mount(container: HTMLElement, size: Size): RendererHandle {
      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('width', String(size.width));
      svg.setAttribute('height', String(size.height));
      svg.setAttribute('viewBox', `0 0 ${size.width} ${size.height}`);
      svg.style.display = 'block';
      if (options.className) svg.setAttribute('class', options.className);
      container.appendChild(svg);

      return {
        render(scene: SceneNode): void {
          while (svg.firstChild) svg.removeChild(svg.firstChild);
          svg.appendChild(buildNode(scene));
        },
        resize(next: Size): void {
          svg.setAttribute('width', String(next.width));
          svg.setAttribute('height', String(next.height));
          svg.setAttribute('viewBox', `0 0 ${next.width} ${next.height}`);
        },
        destroy(): void {
          svg.remove();
        },
      };
    },
  };
}

function buildNode(node: SceneNode): SVGElement {
  switch (node.type) {
    case 'group':
      return buildGroup(node);
    case 'line':
      return buildLine(node);
    case 'polyline':
      return buildPolyline(node);
    case 'rect':
      return buildRect(node);
    case 'circle':
      return buildCircle(node);
    case 'text':
      return buildText(node);
  }
}

function buildGroup(node: GroupNode): SVGElement {
  const g = el('g');
  if (node.x || node.y) {
    g.setAttribute('transform', `translate(${node.x ?? 0}, ${node.y ?? 0})`);
  }
  for (const child of node.children) g.appendChild(buildNode(child));
  return g;
}

function buildLine(node: LineNode): SVGElement {
  const element = el('line');
  element.setAttribute('x1', String(node.x1));
  element.setAttribute('y1', String(node.y1));
  element.setAttribute('x2', String(node.x2));
  element.setAttribute('y2', String(node.y2));
  applyStyle(element, node, { defaultFill: 'none' });
  return element;
}

function buildPolyline(node: PolylineNode): SVGElement {
  const tag = node.closed ? 'polygon' : 'polyline';
  const element = el(tag);
  element.setAttribute('points', node.points.map((p) => `${p.x},${p.y}`).join(' '));
  applyStyle(element, node, { defaultFill: 'none' });
  return element;
}

function buildRect(node: RectNode): SVGElement {
  const element = el('rect');
  element.setAttribute('x', String(node.x));
  element.setAttribute('y', String(node.y));
  element.setAttribute('width', String(Math.max(0, node.width)));
  element.setAttribute('height', String(Math.max(0, node.height)));
  if (node.rx) element.setAttribute('rx', String(node.rx));
  applyStyle(element, node);
  return element;
}

function buildCircle(node: CircleNode): SVGElement {
  const element = el('circle');
  element.setAttribute('cx', String(node.cx));
  element.setAttribute('cy', String(node.cy));
  element.setAttribute('r', String(Math.max(0, node.r)));
  applyStyle(element, node);
  return element;
}

function buildText(node: TextNode): SVGElement {
  const element = el('text');
  element.setAttribute('x', String(node.x));
  element.setAttribute('y', String(node.y));
  element.setAttribute('text-anchor', textAnchor(node.textAlign));
  element.setAttribute('dominant-baseline', dominantBaseline(node.textBaseline));
  if (node.fontSize) element.setAttribute('font-size', String(node.fontSize));
  if (node.fontFamily) element.setAttribute('font-family', node.fontFamily);
  if (node.fontWeight) element.setAttribute('font-weight', String(node.fontWeight));
  element.setAttribute('fill', node.fill ?? '#000');
  if (node.opacity != null) element.setAttribute('opacity', String(node.opacity));
  element.textContent = node.text;
  return element;
}

function el(tag: string): SVGElement {
  return document.createElementNS(SVG_NS, tag);
}

function applyStyle(element: SVGElement, style: Style, opts: { defaultFill?: string } = {}): void {
  element.setAttribute('fill', style.fill ?? opts.defaultFill ?? 'none');
  if (style.stroke) element.setAttribute('stroke', style.stroke);
  if (style.strokeWidth != null) element.setAttribute('stroke-width', String(style.strokeWidth));
  if (style.strokeDash) element.setAttribute('stroke-dasharray', style.strokeDash.join(' '));
  if (style.opacity != null) element.setAttribute('opacity', String(style.opacity));
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
