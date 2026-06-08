// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { createSvgRenderer } from '@chartistry/renderer-svg';
import { Chart } from './Chart';
import { Bars } from './bars';
import { Crosshair } from './interaction';

const data = [
  { name: 'a', v: 10 },
  { name: 'b', v: 30 },
];

// Flush the microtask that the Chart schedules to repaint.
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

afterEach(cleanup);

async function navigateFirst(app: HTMLElement) {
  app.focus();
  fireEvent.keyDown(app, { key: 'ArrowRight' });
  await flush();
}

describe('orientation-aware interaction', () => {
  it('draws a vertical category crosshair for vertical bars', async () => {
    const { container } = render(
      <Chart
        width={200}
        height={120}
        data={data}
        x={(d) => d.name}
        y={(d) => d.v}
        xScaleType="band"
        renderer={createSvgRenderer({ transition: false })}
        title="V"
      >
        <Bars />
        <Crosshair />
      </Chart>,
    );

    await navigateFirst(container.querySelector('[role="application"]') as HTMLElement);

    const guide = container.querySelector('line[stroke-dasharray]') as SVGLineElement;
    expect(guide).not.toBeNull();
    // A vertical guide: the x's match, the y's span the plot.
    expect(guide.getAttribute('x1')).toBe(guide.getAttribute('x2'));
    expect(guide.getAttribute('y1')).not.toBe(guide.getAttribute('y2'));
  });

  it('draws a horizontal category crosshair for horizontal bars', async () => {
    const { container } = render(
      <Chart
        width={200}
        height={120}
        data={data}
        x={(d) => d.name}
        y={(d) => d.v}
        xScaleType="band"
        orientation="horizontal"
        renderer={createSvgRenderer({ transition: false })}
        title="H"
      >
        <Bars />
        <Crosshair />
      </Chart>,
    );

    await navigateFirst(container.querySelector('[role="application"]') as HTMLElement);

    const guide = container.querySelector('line[stroke-dasharray]') as SVGLineElement;
    expect(guide).not.toBeNull();
    // A horizontal guide: the y's match, the x's span the plot.
    expect(guide.getAttribute('y1')).toBe(guide.getAttribute('y2'));
    expect(guide.getAttribute('x1')).not.toBe(guide.getAttribute('x2'));
  });

  it('announces the category and value regardless of orientation', async () => {
    const { container } = render(
      <Chart
        width={200}
        height={120}
        data={data}
        x={(d) => d.name}
        y={(d) => d.v}
        xScaleType="band"
        orientation="horizontal"
        renderer={createSvgRenderer({ transition: false })}
        title="H"
      >
        <Bars />
      </Chart>,
    );

    await navigateFirst(container.querySelector('[role="application"]') as HTMLElement);
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe('a: 10');
  });
});
