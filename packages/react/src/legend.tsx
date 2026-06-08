import { type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useChartContext, type LegendSeries } from './context';

export interface LegendProps {
  /** Shape of the color swatch. Defaults to a rounded square. */
  swatch?: 'square' | 'circle';
  /** Disable click-to-toggle, rendering a static legend. */
  interactive?: boolean;
  /** Custom item renderer; receives the series and a toggle callback. */
  children?: (series: LegendSeries, toggle: () => void) => ReactNode;
}

/**
 * A legend driven entirely by the chart's `series`. Clicking an item toggles
 * that series' visibility — which the Chart honors by dropping it from the
 * scales, marks, and tooltip, then rescaling. Colors stay put because they are
 * assigned over the full key set, not the visible subset.
 *
 * It renders into a slot beneath the chart surface (via portal), so it never
 * overlaps the plot or interferes with hover hit-testing.
 */
export function Legend(props: LegendProps): ReactNode {
  const { allSeries, toggleSeries, legendSlot } = useChartContext();
  const interactive = props.interactive ?? true;

  if (!legendSlot || allSeries.length === 0) return null;

  return createPortal(
    <ul style={listStyle}>
      {allSeries.map((series) => {
        const toggle = () => interactive && toggleSeries(series.key);
        return (
          <li key={series.key}>
            {props.children ? (
              props.children(series, toggle)
            ) : (
              <button
                type="button"
                onClick={toggle}
                disabled={!interactive}
                aria-pressed={!series.hidden}
                style={itemStyle(series.hidden, interactive)}
              >
                <span style={swatchStyle(series.color, props.swatch ?? 'square')} />
                <span style={{ textTransform: 'capitalize' }}>{series.key}</span>
              </button>
            )}
          </li>
        );
      })}
    </ul>,
    legendSlot,
  );
}

const listStyle: CSSProperties = {
  listStyle: 'none',
  display: 'flex',
  flexWrap: 'wrap',
  gap: 16,
  padding: 0,
  margin: '14px 0 0',
};

function itemStyle(hidden: boolean, interactive: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    border: 0,
    background: 'transparent',
    padding: 0,
    font: 'inherit',
    fontSize: 14,
    color: 'inherit',
    cursor: interactive ? 'pointer' : 'default',
    opacity: hidden ? 0.4 : 1,
    textDecoration: hidden ? 'line-through' : 'none',
    transition: 'opacity 0.15s',
  };
}

function swatchStyle(color: string, shape: 'square' | 'circle'): CSSProperties {
  return {
    width: 12,
    height: 12,
    borderRadius: shape === 'circle' ? '50%' : 3,
    background: color,
    display: 'inline-block',
    flex: 'none',
  };
}
