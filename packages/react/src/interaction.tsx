import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { circle, crosshairMark, group, type SceneNode } from '@chartistry/core';
import { useChartContext, type ActivePoint } from './context';
import { useMark } from './use-mark';

/** Read the datum currently under the pointer, for custom interactions. */
export function useChartPointer(): ActivePoint | null {
  return useChartContext().active;
}

export interface CrosshairProps {
  /** Also draw a horizontal guide through the topmost active point. */
  horizontal?: boolean;
  color?: string;
  strokeDash?: number[];
}

/** Reference guides that follow the pointer, painted into the scene graph. */
export function Crosshair(props: CrosshairProps): null {
  const { active, plot } = useChartContext();

  const node = useMemo<SceneNode | null>(() => {
    if (!active) return null;
    const topY = props.horizontal ? Math.min(...active.points.map((p) => p.y)) : undefined;
    return crosshairMark({
      x: active.x,
      y: topY,
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
    const rings = active.points.map((p) =>
      circle({
        cx: active.x,
        cy: p.y,
        r: radius,
        fill: '#ffffff',
        stroke: p.color,
        strokeWidth,
        key: `focus:${p.key}`,
      }),
    );
    return group(rings, { key: 'highlight' });
  }, [active, radius, strokeWidth]);

  useMark(node);
  return null;
}

export interface TooltipProps {
  /** Custom content; receives the active point. Defaults to a value list. */
  children?: (active: ActivePoint) => ReactNode;
  /** Vertical gap between the tooltip and the active point, in pixels. */
  offset?: number;
}

/**
 * An HTML overlay positioned over the active datum. Kept as DOM (not a scene
 * node) so content is freely styleable and accessible, and so it works the
 * same regardless of which renderer painted the chart underneath.
 */
export function Tooltip(props: TooltipProps): ReactNode {
  const { active, plot } = useChartContext();
  if (!active) return null;

  const offset = props.offset ?? 12;
  const topY = Math.min(...active.points.map((p) => p.y));
  const left = active.x + plot.x;
  const top = topY + plot.y - offset;

  const wrapperStyle: CSSProperties = {
    position: 'absolute',
    left,
    top,
    transform: 'translate(-50%, -100%)',
    pointerEvents: 'none',
    zIndex: 2,
  };

  return (
    <div style={wrapperStyle}>
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
