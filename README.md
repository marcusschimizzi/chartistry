# chartistry

A **composable**, **framework-agnostic**, **renderer-pluggable** charting library.

Chartistry is built around one idea: a chart is a _spec_ that gets turned into a
renderer-agnostic **scene graph**, which any backend can paint. That single seam
is what makes the same chart render identically through SVG, Canvas, or anything
else — and what lets thin framework adapters sit on top without re-implementing
the chart logic.

```
   data ──▶ scales ──▶ marks ──▶ scene graph ──▶ renderer ──▶ pixels
                         ▲                            ▲
                  composable pieces            swappable backend
```

## Packages

| Package                       | Responsibility                                                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `@chartistry/core`            | Framework-agnostic core: scales, scene graph, marks, chart layout, and the `Renderer` interface. No DOM, no framework. |
| `@chartistry/renderer-svg`    | Paints a scene graph into SVG DOM. The inspectable, CSS-friendly default.                                              |
| `@chartistry/renderer-canvas` | Paints the same scene graph onto a Canvas 2D context. For larger datasets.                                             |
| `@chartistry/react`           | Composable React components (`<Chart>`, `<LineSeries>`, `<XAxis>`, …) over the core.                                   |

## Quick look

### Vanilla core (works anywhere)

```ts
import { createChart, linearScale, extent, axisLeft, axisBottom, lineMark } from '@chartistry/core';
import { createSvgRenderer } from '@chartistry/renderer-svg';

const data = [
  { x: 0, y: 3 },
  { x: 1, y: 7 },
  { x: 2, y: 4 },
];

const chart = createChart({ width: 640, height: 360 });
const x = linearScale({ domain: extent(data.map((d) => d.x)), range: [0, chart.plot.width] });
const y = linearScale({
  domain: extent(data.map((d) => d.y)),
  range: [chart.plot.height, 0],
  nice: true,
});

const scene = chart.compose([
  axisLeft({ scale: y }),
  axisBottom({ scale: x, offset: chart.plot.height }),
  lineMark({ data, x: (d) => d.x, y: (d) => d.y, xScale: x, yScale: y }),
]);

const handle = createSvgRenderer().mount(document.querySelector('#app')!, chart.size);
handle.render(scene);
```

Swap `createSvgRenderer()` for `createCanvasRenderer()` and nothing else changes.

### React adapter

```tsx
import { Chart, Grid, LineSeries, Points, XAxis, YAxis } from '@chartistry/react';

<Chart width={640} height={360} data={data} x={(d) => d.x} y={(d) => d.y}>
  <Grid axis="y" />
  <YAxis />
  <XAxis />
  <LineSeries stroke="#6366f1" area />
  <Points />
</Chart>;
```

Pass `renderer={createCanvasRenderer()}` to `<Chart>` to switch backends.

### Multi-series bars

Declare a `series` array once, then drop in whichever multi-series mark you want
— grouped bars, stacked bars, or multi-line. Colors are assigned from a
categorical palette automatically.

```tsx
import { Chart, BarGroup, StackedBars, Lines, XAxis, YAxis, Grid } from '@chartistry/react';

const series = [
  { key: 'desktop', y: (d) => d.desktop },
  { key: 'mobile', y: (d) => d.mobile },
  { key: 'tablet', y: (d) => d.tablet },
];

<Chart width={720} height={420} data={rows} x={(d) => d.quarter} xScaleType="band" series={series}>
  <Grid axis="y" />
  <YAxis />
  <XAxis />
  <BarGroup radius={3} /> {/* or <StackedBars /> (add `stackY` to <Chart>), or <Lines /> */}
</Chart>;
```

## Development

This is a [pnpm](https://pnpm.io) workspace.

```bash
pnpm install        # install everything
pnpm dev            # run the interactive playground (Vite)
pnpm test           # run the unit tests (Vitest)
pnpm typecheck      # type-check every package
pnpm lint           # lint
pnpm build          # build all publishable packages
```

The **playground** (`/playground`) is the living demo: it switches between
area, multi-line, grouped-bar, and stacked-bar charts and lets you flip the
renderer (SVG ↔ Canvas) at runtime — all from the same composable spec.

## Status

- ✅ Framework-agnostic core (scales, scene graph, marks, layout)
- ✅ Scales: linear, band, and ordinal/color
- ✅ Marks: line/area, points, axes, grid, bars, grouped & stacked bars
- ✅ Multi-series support with a reusable `stack()` data transform
- ✅ Pluggable renderer interface with SVG and Canvas backends
- ✅ React adapter with composable components
- ✅ Playground proving every chart type across both renderers

### Roadmap ideas

- More scales (time, log) and marks (horizontal bars, areas-as-stacks, pies)
- Keyed scene diffing in the SVG renderer; transitions
- Interaction layer (tooltips, hover, crosshair) over the scene graph
- Accessibility (ARIA, keyboard) baked into the scene model
- Additional adapters (Vue, Svelte, Web Components)

## License

MIT © Marcus Schimizzi
