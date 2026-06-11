// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { createSvgRenderer } from '@chartistry/renderer-svg';
import { Chart } from './Chart';
import { Bubbles } from './bubbles';
import { SizeLegend } from './size-legend';

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};
afterEach(cleanup);
const svg = () => createSvgRenderer({ transition: false });

const data = [{ v: 10 }, { v: 50 }, { v: 100 }];

describe('SizeLegend', () => {
  it('renders nested circles and value labels for the size scale', async () => {
    const { container } = render(
      <Chart
        width={300}
        height={200}
        margin={0}
        data={data}
        x={(_d, i) => i}
        y={() => 0}
        renderer={svg()}
        title="B"
        accessible={false}
      >
        <Bubbles size={(d) => (d as { v: number }).v} sizeRange={[4, 30]} />
        <SizeLegend
          size={(d) => (d as { v: number }).v}
          sizeRange={[4, 30]}
          values={[100, 50, 10]}
          title="Pop"
        />
      </Chart>,
    );
    await flush();

    const labels = Array.from(container.querySelectorAll('text')).map((t) => t.textContent);
    expect(labels).toEqual(expect.arrayContaining(['Pop', '100', '50', '10']));

    // The legend shares the bubbles' scale: value 100 → the sizeRange max (30).
    const radii = Array.from(container.querySelectorAll('circle')).map((c) =>
      Number(c.getAttribute('r')),
    );
    expect(radii).toContain(30);
  });
});
