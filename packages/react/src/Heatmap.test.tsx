// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { createSvgRenderer } from '@chartistry/renderer-svg';
import { Chart } from './Chart';
import { Heatmap } from './heatmap';
import { XAxis, YAxis } from './axes';
import { useChartContext } from './context';

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};
const movePointer = (el: HTMLElement, clientX: number, clientY: number) =>
  fireEvent(el, new MouseEvent('pointermove', { clientX, clientY, bubbles: true }));
afterEach(cleanup);
const svg = () => createSvgRenderer({ transition: false });

interface Cell {
  col: string;
  row: string;
  v: number;
}
const data: Cell[] = [
  { col: 'Mon', row: 'AM', v: 2 },
  { col: 'Mon', row: 'PM', v: 8 },
  { col: 'Tue', row: 'AM', v: 5 },
  { col: 'Tue', row: 'PM', v: 9 },
];

function ActiveCell() {
  const { active } = useChartContext();
  return <div data-testid="active">{active ? String(active.index) : 'none'}</div>;
}

function renderGrid(extra?: ReactNode, opts?: { accessible?: boolean; bandPadding?: number }) {
  return render(
    <Chart
      width={200}
      height={100}
      margin={0}
      data={data}
      x={(d) => d.col}
      xScaleType="band"
      yCategory={(d) => d.row}
      yScaleType="band"
      value={(d) => d.v}
      bandPadding={opts?.bandPadding ?? 0.2}
      renderer={svg()}
      title="H"
      accessible={opts?.accessible ?? false}
    >
      <Heatmap showValues />
      <XAxis />
      <YAxis />
      {extra}
    </Chart>,
  );
}

describe('Heatmap', () => {
  it('draws a uniform cell per datum with axis labels and values', async () => {
    const { container } = renderGrid();
    await flush();
    const cells = Array.from(container.querySelectorAll('rect'));
    expect(cells).toHaveLength(4);
    expect(new Set(cells.map((c) => c.getAttribute('width'))).size).toBe(1);
    expect(new Set(cells.map((c) => c.getAttribute('height'))).size).toBe(1);
    const text = container.textContent ?? '';
    expect(text).toContain('AM'); // y-axis rows
    expect(text).toContain('Mon'); // x-axis columns
    expect(text).toContain('9'); // values
  });

  it('resolves the cell under the pointer in 2D (column AND row)', async () => {
    const { container, getByTestId } = renderGrid(<ActiveCell />, {
      bandPadding: 0,
      accessible: true,
    });
    await flush();
    const app = container.querySelector('[role="application"]') as HTMLElement;
    // Columns [Mon,Tue] over 200px → centers 50/150; rows [AM,PM] over 100 → 25/75.
    movePointer(app, 150, 75); // Tue, PM → datum index 3
    await flush();
    expect(getByTestId('active').textContent).toBe('3');
    movePointer(app, 50, 25); // Mon, AM → datum index 0
    await flush();
    expect(getByTestId('active').textContent).toBe('0');
  });

  it('exposes a hidden cell table (column, row, value) for screen readers', async () => {
    const { container } = renderGrid(undefined, { accessible: true });
    await flush();
    const table = container.querySelector('table');
    expect(table).not.toBeNull();
    const headers = Array.from(table!.querySelectorAll('thead th')).map((th) => th.textContent);
    expect(headers).toEqual(['x', 'Row', 'Value']);
    // Every cell appears as a row, e.g. Tue / PM / 9.
    expect(table!.querySelectorAll('tbody tr')).toHaveLength(4);
    expect(table!.textContent).toContain('9');
  });
});
