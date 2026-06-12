// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { createSvgRenderer } from '@chartistry/renderer-svg';
import { Chart } from './Chart';
import { StackedArea } from './stacked-area';

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};
afterEach(cleanup);
const svg = () => createSvgRenderer({ transition: false });

const data = [
  { m: 0, a: 3, b: 2, c: 1 },
  { m: 1, a: 4, b: 3, c: 2 },
  { m: 2, a: 2, b: 5, c: 3 },
];
const series = [
  { key: 'a', y: (d: (typeof data)[number]) => d.a },
  { key: 'b', y: (d: (typeof data)[number]) => d.b },
  { key: 'c', y: (d: (typeof data)[number]) => d.c },
];

// Closed polylines render as <polygon> elements in SVG.
const polygons = (c: HTMLElement) => c.querySelectorAll('polygon');

describe('StackedArea', () => {
  it('draws one filled band per series', async () => {
    const { container } = render(
      <Chart
        width={240}
        height={140}
        margin={0}
        data={data}
        x={(d) => d.m}
        series={series}
        stackY
        renderer={svg()}
        title="S"
        accessible={false}
      >
        <StackedArea />
      </Chart>,
    );
    await flush();
    expect(polygons(container)).toHaveLength(3);
  });

  it('centers the bands for a silhouette (streamgraph) chart', async () => {
    const { container } = render(
      <Chart
        width={240}
        height={140}
        margin={0}
        data={data}
        x={(d) => d.m}
        series={series}
        stackY="silhouette"
        renderer={svg()}
        title="S"
        accessible={false}
      >
        <StackedArea />
      </Chart>,
    );
    await flush();
    const polys = polygons(container);
    expect(polys).toHaveLength(3);
    // Streamgraph is centered: some geometry sits in the top half of the plot.
    const anyAboveMiddle = Array.from(polys).some((p) =>
      (p.getAttribute('points') ?? '')
        .split(' ')
        .some((pt) => Number(pt.split(',')[1]) < 70),
    );
    expect(anyAboveMiddle).toBe(true);
  });
});
