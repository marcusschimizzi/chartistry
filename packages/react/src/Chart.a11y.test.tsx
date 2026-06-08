// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { Chart } from './Chart';
import { LineSeries } from './series';

const data = [
  { x: 0, y: 10 },
  { x: 1, y: 30 },
  { x: 2, y: 20 },
];

function renderChart(extra?: Record<string, unknown>) {
  return render(
    <Chart
      width={300}
      height={200}
      data={data}
      x={(d) => d.x}
      y={(d) => d.y}
      title="Demo chart"
      description="A tiny line chart."
      xLabel="Index"
      // Animation relies on rAF; keep tests synchronous.
      renderer={undefined}
      {...extra}
    >
      <LineSeries />
    </Chart>,
  );
}

afterEach(cleanup);

describe('Chart accessibility', () => {
  it('exposes the chart as a labelled figure', () => {
    const { container } = renderChart();
    const figure = container.querySelector('[role="figure"]');
    expect(figure).not.toBeNull();
    expect(figure?.getAttribute('aria-label')).toBe('Demo chart');
  });

  it('renders a hidden data table mirroring the data', () => {
    const { container } = renderChart();
    const table = container.querySelector('table')!;
    expect(table.querySelector('caption')?.textContent).toBe('Demo chart');
    // Header: the x column plus one value column.
    const headers = [...table.querySelectorAll('thead th')].map((th) => th.textContent);
    expect(headers).toEqual(['Index', 'Value']);
    // One row per datum, with the value in the cell.
    const rows = table.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
    expect(rows[1]!.querySelector('td')?.textContent).toBe('30');
  });

  it('makes the plot focusable and keyboard-navigable, announcing the datum', () => {
    const { container } = renderChart();
    const app = container.querySelector('[role="application"]') as HTMLElement;
    expect(app.getAttribute('tabindex')).toBe('0');

    const live = container.querySelector('[aria-live="polite"]')!;
    app.focus();
    fireEvent.keyDown(app, { key: 'ArrowRight' });
    expect(live.textContent).toBe('0: 10');

    fireEvent.keyDown(app, { key: 'End' });
    expect(live.textContent).toBe('2: 20');

    fireEvent.keyDown(app, { key: 'Escape' });
    expect(live.textContent).toBe('');
  });

  it('omits the a11y layer when accessible={false}', () => {
    const { container } = renderChart({ accessible: false });
    expect(container.querySelector('[role="figure"]')).toBeNull();
    expect(container.querySelector('table')).toBeNull();
    expect(container.querySelector('[role="application"]')).toBeNull();
  });
});
