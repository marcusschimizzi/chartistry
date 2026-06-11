// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { createSvgRenderer } from '@chartistry/renderer-svg';
import { Chart } from './Chart';
import { Bubbles } from './bubbles';

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};
afterEach(cleanup);

const svg = () => createSvgRenderer({ transition: false });
const radii = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('circle')).map((c) => Number(c.getAttribute('r')));

describe('Bubbles', () => {
  it('encodes value as area from a zero-anchored size domain', async () => {
    const data = [{ v: 0 }, { v: 25 }, { v: 100 }];
    const { container } = render(
      <Chart
        width={200}
        height={200}
        margin={0}
        data={data}
        x={(_d, i) => i}
        y={() => 0}
        renderer={svg()}
        title="B"
        accessible={false}
      >
        <Bubbles size={(d) => (d as { v: number }).v} sizeRange={[2, 20]} />
      </Chart>,
    );
    await flush();

    const r = radii(container);
    expect(r[0]).toBeCloseTo(2); // zero → minimum radius
    expect(r[2]).toBeCloseTo(20); // max → maximum radius
    // √(25/100) = 0.5, so radius is halfway up the range: 2 + 0.5 * 18 = 11.
    expect(r[1]).toBeCloseTo(11);
  });

  it('renders uniform sizes at the maximum radius (no extent padding)', async () => {
    const data = [{ v: 5 }, { v: 5 }, { v: 5 }];
    const { container } = render(
      <Chart
        width={200}
        height={200}
        margin={0}
        data={data}
        x={(_d, i) => i}
        y={() => 0}
        renderer={svg()}
        title="B"
        accessible={false}
      >
        <Bubbles size={(d) => (d as { v: number }).v} sizeRange={[2, 20]} />
      </Chart>,
    );
    await flush();

    expect(radii(container).every((r) => Math.abs(r - 20) < 1e-6)).toBe(true);
  });

  it('draws uniform dots when no size is given (a scatter)', async () => {
    const data = [{ v: 1 }, { v: 9 }];
    const { container } = render(
      <Chart
        width={200}
        height={200}
        margin={0}
        data={data}
        x={(_d, i) => i}
        y={() => 0}
        renderer={svg()}
        title="B"
        accessible={false}
      >
        <Bubbles fill="#000" />
      </Chart>,
    );
    await flush();

    const r = radii(container);
    expect(r).toHaveLength(2);
    expect(r[0]).toBe(r[1]); // no size accessor → constant radius
  });
});
