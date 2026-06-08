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
  TextNode,
} from '@chartistry/core';

export interface CanvasRendererOptions {
  /** Device pixel ratio override; defaults to the host's, for crisp HiDPI. */
  pixelRatio?: number;
}

/**
 * Renders a Chartistry scene graph onto an HTML canvas via the 2D context.
 * Canvas is an immediate-mode target — great for large datasets — yet it
 * consumes the exact same scene graph as the SVG renderer. Group translations
 * map onto `save()/translate()/restore()`, so the coordinate model is identical.
 */
export function createCanvasRenderer(options: CanvasRendererOptions = {}): Renderer {
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

      return {
        render(scene: SceneNode): void {
          ctx.save();
          ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
          ctx.clearRect(0, 0, current.width, current.height);
          drawNode(ctx, scene);
          ctx.restore();
        },
        resize(next: Size): void {
          applySize(next);
        },
        destroy(): void {
          canvas.remove();
        },
      };
    },
  };
}

function drawNode(ctx: CanvasRenderingContext2D, node: SceneNode): void {
  switch (node.type) {
    case 'group':
      return drawGroup(ctx, node);
    case 'line':
      return drawLine(ctx, node);
    case 'polyline':
      return drawPolyline(ctx, node);
    case 'rect':
      return drawRect(ctx, node);
    case 'circle':
      return drawCircle(ctx, node);
    case 'text':
      return drawText(ctx, node);
  }
}

function drawGroup(ctx: CanvasRenderingContext2D, node: GroupNode): void {
  ctx.save();
  ctx.translate(node.x ?? 0, node.y ?? 0);
  for (const child of node.children) drawNode(ctx, child);
  ctx.restore();
}

function drawLine(ctx: CanvasRenderingContext2D, node: LineNode): void {
  ctx.save();
  applyStroke(ctx, node);
  ctx.beginPath();
  ctx.moveTo(node.x1, node.y1);
  ctx.lineTo(node.x2, node.y2);
  if (node.stroke) ctx.stroke();
  ctx.restore();
}

function drawPolyline(ctx: CanvasRenderingContext2D, node: PolylineNode): void {
  if (node.points.length === 0) return;
  ctx.save();
  applyStroke(ctx, node);
  ctx.globalAlpha = node.opacity ?? 1;
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

function drawRect(ctx: CanvasRenderingContext2D, node: RectNode): void {
  ctx.save();
  applyStroke(ctx, node);
  ctx.globalAlpha = node.opacity ?? 1;
  if (node.fill && node.fill !== 'none') {
    ctx.fillStyle = node.fill;
    ctx.fillRect(node.x, node.y, Math.max(0, node.width), Math.max(0, node.height));
  }
  if (node.stroke && node.stroke !== 'none') {
    ctx.strokeRect(node.x, node.y, Math.max(0, node.width), Math.max(0, node.height));
  }
  ctx.restore();
}

function drawCircle(ctx: CanvasRenderingContext2D, node: CircleNode): void {
  ctx.save();
  applyStroke(ctx, node);
  ctx.globalAlpha = node.opacity ?? 1;
  ctx.beginPath();
  ctx.arc(node.cx, node.cy, Math.max(0, node.r), 0, Math.PI * 2);
  if (node.fill && node.fill !== 'none') {
    ctx.fillStyle = node.fill;
    ctx.fill();
  }
  if (node.stroke && node.stroke !== 'none') ctx.stroke();
  ctx.restore();
}

function drawText(ctx: CanvasRenderingContext2D, node: TextNode): void {
  ctx.save();
  const size = node.fontSize ?? 11;
  const family = node.fontFamily ?? 'system-ui, sans-serif';
  const weight = node.fontWeight ?? 'normal';
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = node.fill ?? '#000';
  ctx.globalAlpha = node.opacity ?? 1;
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
  if (node.strokeDash) ctx.setLineDash(node.strokeDash);
  if (node.lineCap) ctx.lineCap = node.lineCap;
  if (node.lineJoin) ctx.lineJoin = node.lineJoin;
}
