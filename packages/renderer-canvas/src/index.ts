import {
  createAnimator,
  type AreaNode,
  type CircleNode,
  type GroupNode,
  type LineNode,
  type PolylineNode,
  type RectNode,
  type Renderer,
  type RendererHandle,
  type SceneNode,
  type Size,
  type TextNode,
} from '@chartistry/core';

const DEFAULT_DURATION = 320;

export interface CanvasRendererOptions {
  /** Device pixel ratio override; defaults to the host's, for crisp HiDPI. */
  pixelRatio?: number;
  /**
   * Animate changes between frames. Pass `false` to disable, or a config to
   * tune it. The core animator tweens the scene and this renderer repaints each
   * interpolated frame, so Canvas transitions match the SVG backend exactly.
   */
  transition?: false | { duration?: number; easing?: (t: number) => number };
}

/**
 * Renders a Chartistry scene graph onto an HTML canvas via the 2D context.
 * Canvas is immediate-mode, so there are no per-mark nodes to retain — instead
 * the core animator hands this renderer a fully interpolated scene each frame
 * and it repaints the whole canvas. The result animates identically to SVG from
 * the very same scene graph.
 */
export function createCanvasRenderer(options: CanvasRendererOptions = {}): Renderer {
  const duration =
    options.transition === false ? 0 : (options.transition?.duration ?? DEFAULT_DURATION);
  const easing = options.transition === false ? undefined : options.transition?.easing;

  return {
    name: 'canvas',
    mount(container: HTMLElement, size: Size): RendererHandle {
      const canvas = document.createElement('canvas');
      canvas.style.display = 'block';
      container.appendChild(canvas);

      const context = canvas.getContext('2d');
      if (!context) throw new Error('[chartistry] 2D canvas context is unavailable');
      const ctx = context;

      let current = size;
      let ratio = options.pixelRatio ?? globalThis.devicePixelRatio ?? 1;

      const applySize = (next: Size): void => {
        current = next;
        ratio = options.pixelRatio ?? globalThis.devicePixelRatio ?? 1;
        canvas.width = Math.round(next.width * ratio);
        canvas.height = Math.round(next.height * ratio);
        canvas.style.width = `${next.width}px`;
        canvas.style.height = `${next.height}px`;
      };
      applySize(size);

      const paint = (scene: SceneNode): void => {
        ctx.save();
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, current.width, current.height);
        drawNode(ctx, scene, 1);
        ctx.restore();
      };

      const animator = createAnimator({
        duration,
        ...(easing ? { easing } : {}),
        onFrame: paint,
      });

      return {
        render: (node: SceneNode) => animator.commit(node),
        resize: (next: Size) => applySize(next),
        destroy: () => {
          animator.stop();
          canvas.remove();
        },
      };
    },
  };
}

function drawNode(ctx: CanvasRenderingContext2D, node: SceneNode, alpha: number): void {
  switch (node.type) {
    case 'group':
      return drawGroup(ctx, node, alpha);
    case 'line':
      return drawLine(ctx, node, alpha);
    case 'polyline':
      return drawPolyline(ctx, node, alpha);
    case 'area':
      return drawArea(ctx, node, alpha);
    case 'rect':
      return drawRect(ctx, node, alpha);
    case 'circle':
      return drawCircle(ctx, node, alpha);
    case 'text':
      return drawText(ctx, node, alpha);
  }
}

function drawGroup(ctx: CanvasRenderingContext2D, node: GroupNode, alpha: number): void {
  ctx.save();
  ctx.translate(node.x ?? 0, node.y ?? 0);
  // Group opacity multiplies into descendants, mirroring SVG's <g opacity>.
  const childAlpha = alpha * (node.opacity ?? 1);
  for (const child of node.children) drawNode(ctx, child, childAlpha);
  ctx.restore();
}

function drawLine(ctx: CanvasRenderingContext2D, node: LineNode, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha * (node.opacity ?? 1);
  applyStroke(ctx, node);
  ctx.beginPath();
  ctx.moveTo(node.x1, node.y1);
  ctx.lineTo(node.x2, node.y2);
  if (node.stroke) ctx.stroke();
  ctx.restore();
}

function drawPolyline(ctx: CanvasRenderingContext2D, node: PolylineNode, alpha: number): void {
  if (node.points.length === 0) return;
  ctx.save();
  ctx.globalAlpha = alpha * (node.opacity ?? 1);
  applyStroke(ctx, node);
  ctx.beginPath();
  node.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  if (node.closed) ctx.closePath();
  if (node.fill && node.fill !== 'none') {
    ctx.fillStyle = node.fill;
    ctx.fill();
  }
  if (node.stroke && node.stroke !== 'none') ctx.stroke();
  ctx.restore();
}

function drawArea(ctx: CanvasRenderingContext2D, node: AreaNode, alpha: number): void {
  if (node.points.length === 0) return;
  ctx.save();
  ctx.globalAlpha = alpha * (node.opacity ?? 1);
  ctx.beginPath();
  node.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  const first = node.points[0]!;
  const last = node.points[node.points.length - 1]!;
  ctx.lineTo(last.x, node.baseline);
  ctx.lineTo(first.x, node.baseline);
  ctx.closePath();
  if (node.fill && node.fill !== 'none') {
    ctx.fillStyle = node.fill;
    ctx.fill();
  }
  if (node.stroke && node.stroke !== 'none') {
    applyStroke(ctx, node);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRect(ctx: CanvasRenderingContext2D, node: RectNode, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha * (node.opacity ?? 1);
  applyStroke(ctx, node);
  const w = Math.max(0, node.width);
  const h = Math.max(0, node.height);
  if (node.fill && node.fill !== 'none') {
    ctx.fillStyle = node.fill;
    ctx.fillRect(node.x, node.y, w, h);
  }
  if (node.stroke && node.stroke !== 'none') ctx.strokeRect(node.x, node.y, w, h);
  ctx.restore();
}

function drawCircle(ctx: CanvasRenderingContext2D, node: CircleNode, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha * (node.opacity ?? 1);
  applyStroke(ctx, node);
  ctx.beginPath();
  ctx.arc(node.cx, node.cy, Math.max(0, node.r), 0, Math.PI * 2);
  if (node.fill && node.fill !== 'none') {
    ctx.fillStyle = node.fill;
    ctx.fill();
  }
  if (node.stroke && node.stroke !== 'none') ctx.stroke();
  ctx.restore();
}

function drawText(ctx: CanvasRenderingContext2D, node: TextNode, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha * (node.opacity ?? 1);
  const size = node.fontSize ?? 11;
  const family = node.fontFamily ?? 'system-ui, sans-serif';
  const weight = node.fontWeight ?? 'normal';
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = node.fill ?? '#000';
  ctx.textAlign = node.textAlign ?? 'left';
  ctx.textBaseline = node.textBaseline ?? 'middle';
  ctx.fillText(node.text, node.x, node.y);
  ctx.restore();
}

function applyStroke(
  ctx: CanvasRenderingContext2D,
  node: {
    stroke?: string;
    strokeWidth?: number;
    strokeDash?: number[];
    lineCap?: CanvasLineCap;
    lineJoin?: CanvasLineJoin;
  },
): void {
  if (node.stroke) ctx.strokeStyle = node.stroke;
  ctx.lineWidth = node.strokeWidth ?? 1;
  ctx.setLineDash(node.strokeDash ?? []);
  if (node.lineCap) ctx.lineCap = node.lineCap;
  if (node.lineJoin) ctx.lineJoin = node.lineJoin;
}
