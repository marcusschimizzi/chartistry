// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { createSvgRenderer } from '@chartistry/renderer-svg';
import { Chart } from './Chart';
import { Annotation, ReferenceBand, ReferenceLine } from './annotations';

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};
afterEach(cleanup);
const svg = () => createSvgRenderer({ transition: false });
const data = [
  { x: 0, y: 10 },
  { x: 1, y: 90 },
];

function renderChart(children: ReactNode, orientation: 'vertical' | 'horizontal' = 'vertical') {
  return render(
    <Chart
      width={200}
      height={100}
      margin={0}
      data={data}
      x={(d) => d.x}
      y={(d) => d.y}
      yDomain={[0, 100]}
      niceY={false}
      orientation={orientation}
      renderer={svg()}
      title="A"
      accessible={false}
    >
      {children}
    </Chart>,
  );
}

describe('ReferenceLine', () => {
  it('draws a horizontal value line across a vertical chart, with a label', async () => {
    const { container } = renderChart(<ReferenceLine y={50} label="target" />);
    await flush();
    const line = container.querySelector('line[stroke-dasharray]') as SVGLineElement;
    expect(line).not.toBeNull();
    expect(line.getAttribute('y1')).toBe('50'); // valueScale(50) over [0,100] → [100,0]
    expect(line.getAttribute('y2')).toBe('50');
    expect(line.getAttribute('x1')).toBe('0');
    expect(line.getAttribute('x2')).toBe('200');
    expect(container.textContent).toContain('target');
  });

  it('draws a vertical value line when the chart is horizontal', async () => {
    const { container } = renderChart(<ReferenceLine y={50} />, 'horizontal');
    await flush();
    const line = container.querySelector('line[stroke-dasharray]') as SVGLineElement;
    expect(line.getAttribute('x1')).toBe(line.getAttribute('x2')); // vertical
    expect(line.getAttribute('y1')).not.toBe(line.getAttribute('y2'));
  });
});

describe('ReferenceBand', () => {
  it('shades a value range', async () => {
    const { container } = renderChart(<ReferenceBand y={[20, 60]} label="ok" />);
    await flush();
    const band = container.querySelector('rect') as SVGRectElement;
    expect(band).not.toBeNull();
    // valueScale(20)=80, valueScale(60)=40 → y=40, height=40
    expect(Number(band.getAttribute('y'))).toBeCloseTo(40);
    expect(Number(band.getAttribute('height'))).toBeCloseTo(40);
    expect(container.textContent).toContain('ok');
  });

  it('covers full category bands for an x range', async () => {
    const bandData = [
      { c: 'A', v: 1 },
      { c: 'B', v: 2 },
      { c: 'C', v: 3 },
      { c: 'D', v: 4 },
    ];
    const { container } = render(
      <Chart
        width={200}
        height={100}
        margin={0}
        data={bandData}
        x={(d) => d.c}
        y={(d) => d.v}
        xScaleType="band"
        bandPadding={0}
        renderer={svg()}
        title="B"
        accessible={false}
      >
        <ReferenceBand x={['A', 'C']} />
      </Chart>,
    );
    await flush();
    // 4 bands of width 50; A..C spans A's left edge (0) to C's right edge (150).
    const band = container.querySelector('rect') as SVGRectElement;
    expect(Number(band.getAttribute('x'))).toBeCloseTo(0);
    expect(Number(band.getAttribute('width'))).toBeCloseTo(150);
  });
});

describe('Annotation', () => {
  it('places a marker and a label at a data point', async () => {
    const { container } = renderChart(<Annotation x={1} y={90} label="peak" />);
    await flush();
    expect(container.querySelector('circle')).not.toBeNull();
    expect(container.textContent).toContain('peak');
  });
});
