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

function YDomain() {
  const { yScale } = useChartContext();
  return <div data-testid="ydom">{JSON.stringify(yScale.domain)}</div>;
}

function renderGrid(
  extra?: ReactNode,
  opts?: { accessible?: boolean; bandPadding?: number; orientation?: 'vertical' | 'horizontal' },
) {
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
      orientation={opts?.orientation ?? 'vertical'}
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

  it('resolves cells when labels contain the separator (no key collision)', async () => {
    // "a b"/"c" and "a"/"b c" would both flatten to "a b c" under a space-joined
    // key; a nested column→row lookup keeps them distinct.
    const collide: Cell[] = [
      { col: 'a b', row: 'c', v: 1 },
      { col: 'a', row: 'b c', v: 2 },
    ];
    const { container, getByTestId } = render(
      <Chart
        width={200}
        height={100}
        margin={0}
        data={collide}
        x={(d) => d.col}
        xScaleType="band"
        yCategory={(d) => d.row}
        yScaleType="band"
        value={(d) => d.v}
        bandPadding={0}
        renderer={svg()}
        title="H"
        accessible
      >
        <Heatmap />
        <ActiveCell />
      </Chart>,
    );
    await flush();
    const app = container.querySelector('[role="application"]') as HTMLElement;
    // Columns [a b, a] → centers 50/150; rows [c, b c] → 25/75.
    movePointer(app, 50, 25); // "a b" / "c" → datum 0
    await flush();
    expect(getByTestId('active').textContent).toBe('0');
    movePointer(app, 150, 75); // "a" / "b c" → datum 1
    await flush();
    expect(getByTestId('active').textContent).toBe('1');
  });

  it('moves keyboard focus spatially by column and row', async () => {
    const { container, getByTestId } = renderGrid(<ActiveCell />, {
      bandPadding: 0,
      accessible: true,
    });
    await flush();
    const app = container.querySelector('[role="application"]') as HTMLElement;
    // data = Mon/AM(0), Mon/PM(1), Tue/AM(2), Tue/PM(3).
    fireEvent.keyDown(app, { key: 'ArrowRight' }); // from none → first cell Mon/AM
    await flush();
    expect(getByTestId('active').textContent).toBe('0');
    fireEvent.keyDown(app, { key: 'ArrowDown' }); // Mon/AM → Mon/PM
    await flush();
    expect(getByTestId('active').textContent).toBe('1');
    fireEvent.keyDown(app, { key: 'ArrowRight' }); // Mon/PM → Tue/PM
    await flush();
    expect(getByTestId('active').textContent).toBe('3');
    fireEvent.keyDown(app, { key: 'ArrowUp' }); // Tue/PM → Tue/AM
    await flush();
    expect(getByTestId('active').textContent).toBe('2');
  });

  it('keeps columns on x and rows on y even when orientation is horizontal', async () => {
    // A grid is two category axes, so orientation must not flip it: columns
    // still span the width (centers 50/150), rows the height (25/75).
    const { container, getByTestId } = renderGrid(<ActiveCell />, {
      bandPadding: 0,
      accessible: true,
      orientation: 'horizontal',
    });
    await flush();
    const app = container.querySelector('[role="application"]') as HTMLElement;
    movePointer(app, 150, 75); // Tue, PM → datum index 3
    await flush();
    expect(getByTestId('active').textContent).toBe('3');
  });

  it('falls back to the value y-axis when yScaleType="band" but no yCategory', async () => {
    // Band y without a row accessor isn't a grid; the y axis must stay the
    // linear value scale (its domain numeric), not an empty band scale.
    const { getByTestId } = render(
      <Chart
        width={200}
        height={100}
        margin={0}
        data={data}
        x={(d) => d.col}
        xScaleType="band"
        y={(d) => d.v}
        yScaleType="band"
        renderer={svg()}
        title="V"
      >
        <YDomain />
      </Chart>,
    );
    await flush();
    const domain = JSON.parse(getByTestId('ydom').textContent ?? '[]');
    expect(domain).toHaveLength(2);
    expect(domain.every((n: unknown) => typeof n === 'number')).toBe(true);
  });

  it('lets keyboard focus start on a sparse grid (first arrow selects a cell)', async () => {
    // A 3×3 grid with only two interior/edge cells populated — no corner has a
    // datum, so a corner-seeking first key would never select anything.
    const sparse = [
      { col: 'B', row: 'mid', v: 5 },
      { col: 'C', row: 'low', v: 7 },
    ];
    const { container, getByTestId } = render(
      <Chart
        width={200}
        height={100}
        margin={0}
        data={sparse}
        x={(d) => d.col}
        xScaleType="band"
        xDomain={['A', 'B', 'C']}
        yCategory={(d) => d.row}
        yScaleType="band"
        value={(d) => d.v}
        renderer={svg()}
        title="S"
        accessible
      >
        <Heatmap />
        <ActiveCell />
      </Chart>,
    );
    await flush();
    const app = container.querySelector('[role="application"]') as HTMLElement;
    fireEvent.keyDown(app, { key: 'ArrowRight' }); // from none → first datum (0)
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
