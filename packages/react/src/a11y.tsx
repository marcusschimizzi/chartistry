import { type CSSProperties, type ReactNode } from 'react';
import type { XValue } from './context';

/** Visually hidden, but available to assistive tech. */
export const srOnly: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

interface A11ySeries {
  key: string;
  y: (datum: unknown, index: number) => number;
}

/** Grid (two-band-axis) a11y: a heatmap announces row + value, not a series. */
export interface GridA11y {
  rowLabel: string;
  rowAccessor: (datum: unknown, index: number) => XValue;
  formatRow: (value: XValue) => string;
  value: (datum: unknown, index: number) => number;
}

/**
 * A one-line spoken description of a datum, for the `aria-live` announcement as
 * the keyboard cursor moves. For a value chart it reads the x value then each
 * series' value (the implicit "value" series unnamed); for a grid (heatmap) it
 * reads the column, row, and cell value.
 */
export function describePoint(
  data: readonly unknown[],
  index: number,
  xAccessor: (datum: unknown, index: number) => XValue,
  formatX: (value: XValue) => string,
  series: readonly A11ySeries[],
  grid?: GridA11y,
): string {
  if (index < 0 || index >= data.length) return '';
  const datum = data[index];
  if (grid) {
    return `${formatX(xAccessor(datum, index))}, ${grid.formatRow(
      grid.rowAccessor(datum, index),
    )}: ${grid.value(datum, index)}`;
  }
  const parts = series.map((s) => {
    const value = s.y(datum, index);
    return s.key === 'value' ? String(value) : `${s.key} ${value}`;
  });
  return `${formatX(xAccessor(datum, index))}: ${parts.join(', ')}`;
}

export interface ChartDataTableProps {
  caption: string;
  xLabel: string;
  data: readonly unknown[];
  xAccessor: (datum: unknown, index: number) => XValue;
  formatX: (value: XValue) => string;
  series: readonly A11ySeries[];
  grid?: GridA11y;
}

/**
 * A visually hidden table mirroring the chart's data. It is the most reliable
 * way to make chart values perceivable: screen-reader users can explore the
 * full dataset structurally, independent of which renderer drew the pixels.
 */
export function ChartDataTable(props: ChartDataTableProps): ReactNode {
  const { caption, xLabel, data, xAccessor, formatX, series, grid } = props;
  // Grid (heatmap): one row per cell, with column, row, and value columns.
  if (grid) {
    return (
      <table style={srOnly}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{xLabel}</th>
            <th scope="col">{grid.rowLabel}</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((datum, i) => (
            <tr key={i}>
              <th scope="row">{formatX(xAccessor(datum, i))}</th>
              <td>{grid.formatRow(grid.rowAccessor(datum, i))}</td>
              <td>{grid.value(datum, i)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return (
    <table style={srOnly}>
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{xLabel}</th>
          {series.map((s) => (
            <th key={s.key} scope="col">
              {s.key === 'value' ? 'Value' : s.key}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((datum, i) => (
          <tr key={i}>
            <th scope="row">{formatX(xAccessor(datum, i))}</th>
            {series.map((s) => (
              <td key={s.key}>{s.y(datum, i)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
