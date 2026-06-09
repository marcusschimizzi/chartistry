import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { circle, crosshairMark, group, type SceneNode } from '@chartistry/core';
import { useChartContext, type ActivePoint } from './context';
import { useMark } from './use-mark';

/** Read the datum currently under the pointer, for custom interactions. */
export function useChartPointer(): ActivePoint | null {
  return useChartContext().active;
}

/** Pixel position of the value guide along the value axis (extreme point). */
function valueGuide(active: ActivePoint): number {
  const positions = active.points.map((p) => p.position);
  // Vertical charts mark the topmost point; horizontal, the rightmost.
  return active.orientation === 'horizontal' ? Math.max(...positions) : Math.min(...positions);
}

export interface CrosshairProps {
  /** Also draw a guide along the value axis through the extreme active point. */
  horizontal?: boolean;
  color?: string;
  strokeDash?: number[];
}

/** Reference guides that follow the pointer, painted into the scene graph. */
export function Crosshair(props: CrosshairProps): null {
  const { active, plot } = useChartContext();

  const node = useMemo<SceneNode | null>(() => {
    if (!active || active.points.length === 0) return null;
    const horizontal = active.orientation === 'horizontal';
    const value = props.horizontal ? valueGuide(active) : undefined;
    // The category guide runs across the value axis; the value guide (optional)
    // runs across the category axis — swapped for horizontal layouts.
    return crosshairMark({
      x: horizontal ? value : active.category,
      y: horizontal ? active.category : value,
      width: plot.width,
      height: plot.height,
      color: props.color,
      strokeDash: props.strokeDash,
    });
  }, [active, plot.width, plot.height, props.horizontal, props.color, props.strokeDash]);

  useMark(node);
  return null;
}

export interface HighlightProps {
  radius?: number;
  strokeWidth?: number;
}

/** Focus rings on each series' value at the active datum. Best for lines. */
export function Highlight(props: HighlightProps): null {
  const { active } = useChartContext();
  const radius = props.radius ?? 4;
  const strokeWidth = props.strokeWidth ?? 2;

  const node = useMemo<SceneNode | null>(() => {
    if (!active) return null;
    const horizontal = active.orientation === 'horizontal';
    const rings = active.points.map((p) =>
      circle({
        cx: horizontal ? p.position : active.category,
        cy: horizontal ? active.category : p.position,
        r: radius,
        fill: '#ffffff',
        stroke: p.color,
        strokeWidth,
        key: `focus:${p.key}`,
      }),
    );
    // Focus rings track the pointer too, so they snap rather than ease.
    return group(rings, { key: 'highlight', animate: false });
  }, [active, radius, strokeWidth]);

  useMark(node);
  return null;
}

export interface TooltipProps {
  /** Custom content; receives the active point. Defaults to a value list. */
  children?: (active: ActivePoint) => ReactNode;
  /** Gap between the tooltip and the active point, in pixels. */
  offset?: number;
}

/** A measured size, in pixels. */
interface Box {
  width: number;
  height: number;
}

/**
 * Decide the tooltip's top-left given the anchor point, its *measured* size, and
 * the container bounds. It prefers a side (above for vertical charts, right for
 * horizontal), flips to the opposite side when the preferred one would overflow,
 * and finally clamps to the container so the panel is always fully visible —
 * exact, rather than the old midpoint guess that ignored the panel's real size.
 */
export function placeTooltip(
  anchor: { x: number; y: number },
  box: Box,
  offset: number,
  orientation: 'vertical' | 'horizontal',
  bounds: Box,
): { left: number; top: number } {
  let left: number;
  let top: number;

  if (orientation === 'horizontal') {
    // Prefer the right of the point; flip left only if the panel would overflow.
    const right = anchor.x + offset;
    left = right + box.width > bounds.width ? anchor.x - offset - box.width : right;
    top = anchor.y - box.height / 2;
  } else {
    // Prefer above the point; flip below only if the panel would overflow the top.
    const above = anchor.y - offset - box.height;
    top = above < 0 ? anchor.y + offset : above;
    left = anchor.x - box.width / 2;
  }

  // Keep the panel inside the container on the cross axis (and after any flip).
  left = clamp(left, 0, Math.max(0, bounds.width - box.width));
  top = clamp(top, 0, Math.max(0, bounds.height - box.height));
  return { left, top };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * An HTML overlay positioned over the active datum. Kept as DOM (not a scene
 * node) so content is freely styleable and accessible, and so it works the
 * same regardless of which renderer painted the chart underneath. It measures
 * its own rendered size and places itself so it never spills off the chart —
 * above the data for vertical charts, beside it for horizontal ones.
 */
export function Tooltip(props: TooltipProps): ReactNode {
  const { active, plot, size } = useChartContext();
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box>({ width: 0, height: 0 });

  // Measure the panel before the browser paints, so placement uses its true
  // size. Re-runs when the content can change (the active point, or a custom
  // renderer); the equality guard stops the setBox from looping.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next = { width: el.offsetWidth, height: el.offsetHeight };
    setBox((prev) => (prev.width === next.width && prev.height === next.height ? prev : next));
  }, [active, props.children]);

  if (!active || active.points.length === 0) return null;

  const offset = props.offset ?? 12;
  const value = valueGuide(active);
  // Anchor at the active point, in host (chart container) coordinates.
  const anchor =
    active.orientation === 'horizontal'
      ? { x: value + plot.x, y: active.category + plot.y }
      : { x: active.category + plot.x, y: value + plot.y };
  const { left, top } = placeTooltip(anchor, box, offset, active.orientation, size);

  return (
    <div ref={ref} style={{ position: 'absolute', pointerEvents: 'none', zIndex: 2, left, top }}>
      {props.children ? props.children(active) : <DefaultTooltip active={active} />}
    </div>
  );
}

const panelStyle: CSSProperties = {
  background: 'rgba(15, 23, 42, 0.92)',
  color: '#f8fafc',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 12,
  fontFamily: 'system-ui, sans-serif',
  lineHeight: 1.5,
  whiteSpace: 'nowrap',
  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.25)',
};

function DefaultTooltip({ active }: { active: ActivePoint }): ReactNode {
  return (
    <div style={panelStyle}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{String(active.xValue)}</div>
      {active.points.map((p) => (
        <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: p.color,
              display: 'inline-block',
            }}
          />
          <span style={{ opacity: 0.85, textTransform: 'capitalize' }}>{p.key}</span>
          <span style={{ marginLeft: 'auto', fontWeight: 600 }}>{formatValue(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
