// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { createSvgRenderer } from '@chartistry/renderer-svg';
import { Chart } from './Chart';
import { Bars } from './bars';
import { Tooltip, placeTooltip } from './interaction';

describe('placeTooltip', () => {
  const box = { width: 100, height: 40 };
  const bounds = { width: 300, height: 200 };

  it('sits above and centered for a vertical chart with room', () => {
    const { left, top } = placeTooltip({ x: 150, y: 120 }, box, 12, 'vertical', bounds);
    expect(left).toBe(100); // 150 - 100/2
    expect(top).toBe(68); // 120 - 12 - 40
  });

  it('flips below when there is no room above', () => {
    const { top } = placeTooltip({ x: 150, y: 10 }, box, 12, 'vertical', bounds);
    expect(top).toBe(22); // 10 + 12, below the point
  });

  it('clamps horizontally so a vertical tooltip never spills off the sides', () => {
    // Far-right point would push the centered panel past the right edge.
    const right = placeTooltip({ x: 295, y: 100 }, box, 12, 'vertical', bounds);
    expect(right.left).toBe(200); // clamped to bounds.width - box.width
    const left = placeTooltip({ x: 5, y: 100 }, box, 12, 'vertical', bounds);
    expect(left.left).toBe(0); // clamped to the left edge
  });

  it('sits to the right for a horizontal chart with room', () => {
    const { left, top } = placeTooltip({ x: 100, y: 90 }, box, 12, 'horizontal', bounds);
    expect(left).toBe(112); // 100 + 12
    expect(top).toBe(70); // 90 - 40/2
  });

  it('flips left when the panel would overflow the right edge', () => {
    // 250 + 12 + 100 = 362 > 300, so flip to the left of the point.
    const { left } = placeTooltip({ x: 250, y: 90 }, box, 12, 'horizontal', bounds);
    expect(left).toBe(138); // 250 - 12 - 100
  });

  it('clamps vertically so a horizontal tooltip stays in view', () => {
    const { top } = placeTooltip({ x: 100, y: 5 }, box, 12, 'horizontal', bounds);
    expect(top).toBe(0); // would be 5 - 20 = -15, clamped to 0
  });
});

// jsdom reports zero layout, so stub the panel's measured size to exercise the
// measure-then-place path end to end.
let dims: { offsetWidth?: PropertyDescriptor; offsetHeight?: PropertyDescriptor };
beforeEach(() => {
  dims = {
    offsetWidth: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth'),
    offsetHeight: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight'),
  };
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get: () => 100,
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get: () => 40,
  });
});
afterEach(() => {
  if (dims.offsetWidth)
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', dims.offsetWidth);
  if (dims.offsetHeight)
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', dims.offsetHeight);
  cleanup();
});

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('Tooltip', () => {
  it('keeps the measured panel within the chart bounds at an edge', async () => {
    const data = [
      { name: 'a', v: 10 },
      { name: 'b', v: 30 },
      { name: 'c', v: 20 },
    ];
    const width = 200;
    const height = 120;
    const { container } = render(
      <Chart
        width={width}
        height={height}
        data={data}
        x={(d) => d.name}
        y={(d) => d.v}
        xScaleType="band"
        renderer={createSvgRenderer({ transition: false })}
        title="T"
      >
        <Bars />
        <Tooltip />
      </Chart>,
    );
    await flush();

    // Focus the last category — its anchor sits near the right edge.
    const app = container.querySelector('[role="application"]') as HTMLElement;
    fireEvent.keyDown(app, { key: 'End' });
    await flush();

    const panel = container.querySelector('div[style*="z-index: 2"]') as HTMLElement;
    expect(panel).not.toBeNull();
    const left = parseFloat(panel.style.left);
    const top = parseFloat(panel.style.top);
    // The measured 100×40 panel stays fully inside the 200×120 container.
    expect(left).toBeGreaterThanOrEqual(0);
    expect(left + 100).toBeLessThanOrEqual(width);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(top + 40).toBeLessThanOrEqual(height);
  });
});
