// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import {
  arc,
  area,
  axisLeft,
  createChart,
  group,
  lineMark,
  linearScale,
  rect,
} from '@chartistry/core';
import { createSvgRenderer } from './index';

function buildScene() {
  const data = [
    { x: 0, y: 1 },
    { x: 1, y: 3 },
    { x: 2, y: 2 },
  ];
  const chart = createChart({ width: 300, height: 200, margin: 20 });
  const xScale = linearScale({ domain: [0, 2], range: [0, chart.plot.width] });
  const yScale = linearScale({ domain: [0, 3], range: [chart.plot.height, 0] });
  return chart.compose([
    axisLeft({ scale: yScale }),
    lineMark({ data, x: (d) => d.x, y: (d) => d.y, xScale, yScale }),
  ]);
}

let host: HTMLElement;
afterEach(() => host?.remove());

describe('createSvgRenderer', () => {
  it('mounts an <svg> sized to the chart', () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    const handle = createSvgRenderer().mount(host, { width: 300, height: 200 });

    const svg = host.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('width')).toBe('300');
    handle.destroy();
    expect(host.querySelector('svg')).toBeNull();
  });

  it('paints the scene graph into SVG elements', () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    const handle = createSvgRenderer().mount(host, { width: 300, height: 200 });
    handle.render(buildScene());

    const svg = host.querySelector('svg')!;
    // A line series produces a polyline; the axis produces lines + text.
    expect(svg.querySelectorAll('polyline').length).toBeGreaterThan(0);
    expect(svg.querySelectorAll('line').length).toBeGreaterThan(0);
    expect(svg.querySelectorAll('text').length).toBeGreaterThan(0);
  });

  it('replaces content on re-render rather than appending', () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    const handle = createSvgRenderer().mount(host, { width: 300, height: 200 });
    handle.render(buildScene());
    const first = host.querySelectorAll('polyline').length;
    handle.render(buildScene());
    expect(host.querySelectorAll('polyline').length).toBe(first);
  });
});

// Diffing is deterministic with transitions off (no async rAF tweening).
describe('createSvgRenderer keyed diffing', () => {
  const bars = (heights: number[]) =>
    group(
      heights.map((h, i) =>
        rect({ key: `bar-${i}`, x: i * 20, y: 100 - h, width: 16, height: h, fill: '#000' }),
      ),
      { key: 'root' },
    );

  it('reuses the same DOM element for a stable key across renders', () => {
    host = document.createElement('div');
    const handle = createSvgRenderer({ transition: false }).mount(host, {
      width: 200,
      height: 100,
    });

    handle.render(bars([40, 60]));
    const firstRect = host.querySelector('rect')!;
    expect(firstRect).not.toBeNull();

    handle.render(bars([80, 60]));
    const afterRect = host.querySelector('rect')!;
    // Same element instance, updated in place.
    expect(afterRect).toBe(firstRect);
    expect(afterRect.getAttribute('height')).toBe('80');
    expect(afterRect.getAttribute('y')).toBe('20');
  });

  it('removes elements whose keys disappear', () => {
    host = document.createElement('div');
    const handle = createSvgRenderer({ transition: false }).mount(host, {
      width: 200,
      height: 100,
    });

    handle.render(bars([10, 20, 30]));
    expect(host.querySelectorAll('rect')).toHaveLength(3);

    handle.render(bars([10, 20]));
    expect(host.querySelectorAll('rect')).toHaveLength(2);
  });

  it('adds elements for new keys', () => {
    host = document.createElement('div');
    const handle = createSvgRenderer({ transition: false }).mount(host, {
      width: 200,
      height: 100,
    });

    handle.render(bars([10]));
    expect(host.querySelectorAll('rect')).toHaveLength(1);

    handle.render(bars([10, 20, 30]));
    expect(host.querySelectorAll('rect')).toHaveLength(3);
  });

  it('renders an area as a polygon capped to its baseline', () => {
    host = document.createElement('div');
    const handle = createSvgRenderer({ transition: false }).mount(host, {
      width: 200,
      height: 100,
    });

    const scene = group(
      [
        area(
          [
            { x: 0, y: 10 },
            { x: 50, y: 40 },
          ],
          { key: 'a', baseline: 100, fill: '#abc' },
        ),
      ],
      { key: 'root' },
    );
    handle.render(scene);

    const polygon = host.querySelector('polygon')!;
    expect(polygon).not.toBeNull();
    // The two data points, then the two baseline caps (last.x, first.x at y=100).
    expect(polygon.getAttribute('points')).toBe('0,10 50,40 50,100 0,100');
    expect(polygon.getAttribute('fill')).toBe('#abc');
  });

  it('renders an arc as a path', () => {
    host = document.createElement('div');
    const handle = createSvgRenderer({ transition: false }).mount(host, {
      width: 100,
      height: 100,
    });
    const scene = group(
      [
        arc({
          key: 'a',
          cx: 50,
          cy: 50,
          innerRadius: 0,
          outerRadius: 40,
          startAngle: 0,
          endAngle: Math.PI / 2,
          fill: '#abc',
        }),
      ],
      { key: 'root' },
    );
    handle.render(scene);

    const path = host.querySelector('path')!;
    expect(path).not.toBeNull();
    expect(path.getAttribute('fill')).toBe('#abc');
    // A pie slice path moves to the center and closes.
    const d = path.getAttribute('d')!;
    expect(d.startsWith('M 50,50')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
  });
});
