// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { createSvgRenderer } from '@chartistry/renderer-svg';
import { Chart } from './Chart';
import { Heatmap } from './heatmap';

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};
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

describe('Heatmap', () => {
  it('draws a cell per datum with row labels and optional values', async () => {
    const { container } = render(
      <Chart
        width={200}
        height={120}
        margin={{ top: 0, right: 0, bottom: 0, left: 30 }}
        data={data}
        x={(d) => d.col}
        xScaleType="band"
        renderer={svg()}
        title="H"
        accessible={false}
      >
        <Heatmap y={(d) => (d as Cell).row} value={(d) => (d as Cell).v} showValues />
      </Chart>,
    );
    await flush();

    // One rect per cell (2 columns × 2 rows).
    expect(container.querySelectorAll('rect')).toHaveLength(4);
    const textContent = container.textContent ?? '';
    expect(textContent).toContain('AM'); // row labels
    expect(textContent).toContain('PM');
    expect(textContent).toContain('9'); // value labels
  });
});
