// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { createSvgRenderer } from '@chartistry/renderer-svg';
import { Chart } from './Chart';
import { Heatmap } from './heatmap';
import { XAxis, YAxis } from './axes';
import { Tooltip } from './interaction';
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

  it('omits off-grid cells from the drawing and the color domain', async () => {
    // 'Z' is outside xDomain → it must not render a rect nor stretch the color
    // range. With only Mon/AM=2 on the grid, that one cell is the whole extent.
    const withStray = [
      { col: 'Z', row: 'AM', v: 999 }, // off-grid
      { col: 'Mon', row: 'AM', v: 2 }, // the only on-grid cell
    ];
    const { container } = render(
      <Chart
        width={200}
        height={100}
        margin={0}
        data={withStray}
        x={(d) => d.col}
        xScaleType="band"
        xDomain={['Mon', 'Tue']}
        yCategory={(d) => d.row}
        yScaleType="band"
        value={(d) => d.v}
        renderer={svg()}
        title="Z"
        accessible
      >
        <Heatmap showValues />
      </Chart>,
    );
    await flush();
    const rects = Array.from(container.querySelectorAll('rect'));
    expect(rects).toHaveLength(1); // off-grid 'Z' cell is not drawn
    // The drawing (SVG) shows the on-grid value but not the off-grid one.
    const drawn = container.querySelector('svg')?.textContent ?? '';
    expect(drawn).toContain('2');
    expect(drawn).not.toContain('999');
    // The hidden a11y table lists only on-grid cells too (one row, no 999).
    const table = container.querySelector('table');
    expect(table!.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(table!.textContent).not.toContain('999');
  });

  it('keyboard start skips datums whose column is outside the grid', async () => {
    // The first datum ('Z') is outside xDomain, so it never renders a cell and
    // pointer hit-testing can't select it; keyboard start must skip it too.
    const withStray = [
      { col: 'Z', row: 'low', v: 1 }, // index 0, but 'Z' ∉ xDomain
      { col: 'B', row: 'mid', v: 5 }, // index 1, the first real cell
    ];
    const { container, getByTestId } = render(
      <Chart
        width={200}
        height={100}
        margin={0}
        data={withStray}
        x={(d) => d.col}
        xScaleType="band"
        xDomain={['A', 'B', 'C']}
        yCategory={(d) => d.row}
        yScaleType="band"
        value={(d) => d.v}
        renderer={svg()}
        title="Z"
        accessible
      >
        <Heatmap />
        <ActiveCell />
      </Chart>,
    );
    await flush();
    const app = container.querySelector('[role="application"]') as HTMLElement;
    fireEvent.keyDown(app, { key: 'ArrowRight' }); // → first grid cell, not index 0
    await flush();
    expect(getByTestId('active').textContent).toBe('1');
  });

  it('honors yCategoryDomain for row order and declared empty rows', async () => {
    // Data only has rows AM/PM; the domain adds an empty "Mid" row and fixes
    // the order PM, Mid, AM — so the y-axis shows all three in that order.
    const { container } = render(
      <Chart
        width={200}
        height={120}
        margin={{ left: 40 }}
        data={data}
        x={(d) => d.col}
        xScaleType="band"
        yCategory={(d) => d.row}
        yCategoryDomain={['PM', 'Mid', 'AM']}
        yScaleType="band"
        value={(d) => d.v}
        renderer={svg()}
        title="D"
      >
        <Heatmap />
        <YAxis />
      </Chart>,
    );
    await flush();
    const text = container.textContent ?? '';
    expect(text).toContain('Mid'); // declared, data-less row still appears
    // Still one rect per datum (the empty row adds no cells).
    expect(container.querySelectorAll('rect')).toHaveLength(4);
  });

  it('default tooltip shows the column, row, and value of the hovered cell', async () => {
    // No axes or cell labels, so the only on-screen text is the tooltip's.
    const { container } = render(
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
        bandPadding={0}
        renderer={svg()}
        title="T"
        accessible
      >
        <Heatmap />
        <Tooltip />
      </Chart>,
    );
    await flush();
    const app = container.querySelector('[role="application"]') as HTMLElement;
    movePointer(app, 150, 75); // Tue, PM → value 9
    await flush();
    const tip = container.textContent ?? '';
    expect(tip).toContain('Tue'); // column header
    expect(tip).toContain('PM'); // row label
    expect(tip).toContain('9'); // cell value
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
