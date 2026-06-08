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

/**
 * A one-line spoken description of a datum: its x value followed by each
 * series' value. Used for the `aria-live` announcement as the keyboard cursor
 * moves. The single implicit series ("value") is announced without its name.
 */
export function describePoint(
  data: readonly unknown[],
  index: number,
  xAccessor: (datum: unknown, index: number) => XValue,
  formatX: (value: XValue) => string,
  series: readonly A11ySeries[],
): string {
  if (index < 0 || index >= data.length) return '';
  const datum = data[index];
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
}

/**
 * A visually hidden table mirroring the chart's data. It is the most reliable
 * way to make chart values perceivable: screen-reader users can explore the
 * full dataset structurally, independent of which renderer drew the pixels.
 */
export function ChartDataTable(props: ChartDataTableProps): ReactNode {
  const { caption, xLabel, data, xAccessor, formatX, series } = props;
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
