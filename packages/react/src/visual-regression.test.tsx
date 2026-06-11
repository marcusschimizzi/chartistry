// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { createSvgRenderer } from '@chartistry/renderer-svg';
import {
  Bars,
  BarGroup,
  StackedBars,
  Bubbles,
  Chart,
  Grid,
  Lines,
  LineSeries,
  Pie,
  Points,
  XAxis,
  YAxis,
} from './index';

/**
 * Visual-regression suite. Each fixture renders a representative chart through
 * the real pipeline — React composition, scales, marks, and the SVG renderer —
 * and snapshots the resulting SVG markup. Transitions are off so the final frame
 * paints synchronously, which makes the output a pure function of the inputs:
 * any change to geometry, structure, color, or text shows up as a snapshot diff.
 *
 * This is deterministic (no browser, fonts, or pixel anti-aliasing), so it runs
 * in the normal test job and never flakes across environments.
 */

// Flush the microtask the Chart schedules to repaint, then read the SVG.
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};
afterEach(cleanup);

const svg = () => createSvgRenderer({ transition: false });
const size = { width: 240, height: 160 } as const;
const margin = { top: 8, right: 8, bottom: 20, left: 26 };

const categorical = [
  { name: 'A', a: 30, b: 18 },
  { name: 'B', a: 52, b: 26 },
  { name: 'C', a: 41, b: 33 },
  { name: 'D', a: 67, b: 40 },
];
const numeric = [
  { x: 0, y: 20 },
  { x: 1, y: 34 },
  { x: 2, y: 28 },
  { x: 3, y: 48 },
  { x: 4, y: 40 },
  { x: 5, y: 62 },
];
const timed = [
  { t: new Date('2024-01-01'), v: 10 },
  { t: new Date('2024-02-01'), v: 24 },
  { t: new Date('2024-03-01'), v: 18 },
  { t: new Date('2024-04-01'), v: 33 },
];
const pieData = [
  { name: 'A', v: 30 },
  { name: 'B', v: 20 },
  { name: 'C', v: 12 },
  { name: 'D', v: 8 },
];

const series2 = [
  { key: 'a', y: (d: (typeof categorical)[number]) => d.a, color: '#4f46e5' },
  { key: 'b', y: (d: (typeof categorical)[number]) => d.b, color: '#10b981' },
];

const fixtures: Array<{ name: string; element: ReactElement }> = [
  {
    name: 'vertical bars',
    element: (
      <Chart {...size} margin={margin} data={categorical} x={(d) => d.name} y={(d) => d.a} xScaleType="band" title="VR" renderer={svg()}>
        <Grid />
        <YAxis />
        <XAxis />
        <Bars />
      </Chart>
    ),
  },
  {
    name: 'horizontal bars',
    element: (
      <Chart {...size} margin={margin} data={categorical} x={(d) => d.name} y={(d) => d.a} xScaleType="band" orientation="horizontal" title="VR" renderer={svg()}>
        <YAxis />
        <XAxis />
        <Bars />
      </Chart>
    ),
  },
  {
    name: 'grouped bars',
    element: (
      <Chart {...size} margin={margin} data={categorical} x={(d) => d.name} xScaleType="band" series={series2} title="VR" renderer={svg()}>
        <YAxis />
        <XAxis />
        <BarGroup />
      </Chart>
    ),
  },
  {
    name: 'stacked bars',
    element: (
      <Chart {...size} margin={margin} data={categorical} x={(d) => d.name} xScaleType="band" series={series2} stackY title="VR" renderer={svg()}>
        <YAxis />
        <XAxis />
        <StackedBars />
      </Chart>
    ),
  },
  {
    name: 'line',
    element: (
      <Chart {...size} margin={margin} data={numeric} x={(d) => d.x} y={(d) => d.y} title="VR" renderer={svg()}>
        <Grid />
        <YAxis />
        <XAxis />
        <LineSeries />
      </Chart>
    ),
  },
  {
    name: 'area with points',
    element: (
      <Chart {...size} margin={margin} data={numeric} x={(d) => d.x} y={(d) => d.y} title="VR" renderer={svg()}>
        <YAxis />
        <XAxis />
        <LineSeries area />
        <Points />
      </Chart>
    ),
  },
  {
    name: 'multi-line',
    element: (
      <Chart {...size} margin={margin} data={categorical} x={(_d, i) => i} series={series2} title="VR" renderer={svg()}>
        <YAxis />
        <XAxis />
        <Lines />
      </Chart>
    ),
  },
  {
    name: 'scatter',
    element: (
      <Chart {...size} margin={margin} data={numeric} x={(d) => d.x} y={(d) => d.y} title="VR" renderer={svg()}>
        <YAxis />
        <XAxis />
        <Points />
      </Chart>
    ),
  },
  {
    name: 'bubbles',
    element: (
      <Chart {...size} margin={margin} data={numeric} x={(d) => d.x} y={(d) => d.y} title="VR" renderer={svg()}>
        <YAxis />
        <XAxis />
        <Bubbles
          size={(d) => (d as { y: number }).y}
          color={(_d, i) => (i % 2 === 0 ? 'even' : 'odd')}
          sizeRange={[3, 14]}
        />
      </Chart>
    ),
  },
  {
    name: 'time axis line',
    element: (
      <Chart {...size} margin={margin} data={timed} x={(d) => d.t} y={(d) => d.v} xScaleType="time" utc title="VR" renderer={svg()}>
        <YAxis />
        <XAxis />
        <LineSeries />
      </Chart>
    ),
  },
  {
    name: 'pie',
    element: (
      <Chart {...size} margin={8} data={pieData} x={(d) => d.name} y={(d) => d.v} title="VR" renderer={svg()}>
        <Pie />
      </Chart>
    ),
  },
  {
    name: 'donut',
    element: (
      <Chart {...size} margin={8} data={pieData} x={(d) => d.name} y={(d) => d.v} title="VR" renderer={svg()}>
        <Pie innerRadius={0.6} />
      </Chart>
    ),
  },
];

describe('visual regression (SVG renderer)', () => {
  for (const fixture of fixtures) {
    it(fixture.name, async () => {
      const { container } = render(fixture.element);
      await flush();
      const el = container.querySelector('svg');
      expect(el).not.toBeNull();
      expect(el?.outerHTML).toMatchSnapshot();
    });
  }
});
