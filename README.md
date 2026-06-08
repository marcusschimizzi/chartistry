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

| Package                       | Responsibility                                                                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `@chartistry/core`            | Framework-agnostic core: scales, scene graph, marks, layout, the `Renderer` interface, and the transition animator. No DOM, no framework. |
| `@chartistry/renderer-svg`    | Paints interpolated scenes into SVG DOM, reusing elements by `key`.                                                                       |
| `@chartistry/renderer-canvas` | Repaints interpolated scenes onto a Canvas 2D context. For larger datasets.                                                               |
| `@chartistry/react`           | Composable React components (`<Chart>`, `<LineSeries>`, `<XAxis>`, …) over the core.                                                      |

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
import { Chart, BarGroup, StackedBars, Lines, Legend, XAxis, YAxis, Grid } from '@chartistry/react';

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
  <Legend /> {/* click an item to hide a series; scales and the tooltip follow */}
</Chart>;
```

Add `<Legend>`, and clicking an item toggles that series off — Chartistry drops
it from the scales, marks, and tooltip and rescales, while colors stay put. The
legend renders beneath the chart and reads `series` automatically.

### Interaction

Add `<Tooltip>`, `<Crosshair>`, and `<Highlight>` as children. They share a
single pointer model resolved in the core via renderer-agnostic hit-testing, so
they behave identically on SVG and Canvas. The crosshair and focus rings are
painted into the scene graph; the tooltip is an HTML overlay you can fully
restyle with a render prop.

```tsx
import {
  Chart,
  LineSeries,
  Crosshair,
  Highlight,
  Tooltip,
  useChartPointer,
} from '@chartistry/react';

<Chart width={640} height={360} data={data} x={(d) => d.x} y={(d) => d.y}>
  <LineSeries area />
  <Crosshair horizontal />
  <Highlight />
  <Tooltip /> {/* or <Tooltip>{(active) => <MyPanel point={active} />}</Tooltip> */}
</Chart>;

// ...or read the active datum yourself:
const active = useChartPointer();
```

### Transitions

A backend-agnostic **animator** in the core diffs successive scenes by `key`,
classifies nodes as enter / update / exit, and emits interpolated scenes each
frame. Renderers just paint what they're handed — SVG patches the DOM, Canvas
repaints — so **both backends animate identically** from one scene spec. Toggling
a series or changing data eases (bars regrow, axes reflow) instead of snapping.

```ts
createSvgRenderer({ transition: { duration: 320 } }); // the default
createCanvasRenderer({ transition: false }); // snap, no animation
```

Pointer-driven marks (crosshair, highlight) carry `animate: false` so they track
the cursor instantly. Because the animator is pure scene-to-scene, it's unit
tested without a DOM. When a line's point count changes, its path is resampled
to a shared resolution and morphed point-wise, then snapped exactly to the
target — so adding or removing data reshapes the line smoothly.

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
- ✅ Interaction layer: renderer-agnostic hit-testing, crosshair, highlight, tooltip
- ✅ Legend with click-to-toggle series (rescales scales, marks, and tooltip)
- ✅ Pluggable renderer interface with SVG and Canvas backends
- ✅ Backend-agnostic transition animator: enter/update/exit, shared by both renderers
- ✅ Polyline path morphing (resampling) when a line's point count changes
- ✅ React adapter with composable components
- ✅ Playground proving every chart type, interaction, and transitions across both renderers

### Roadmap ideas

- More scales (time, log) and marks (horizontal bars, areas-as-stacks, pies)
- Accessibility (ARIA, keyboard) baked into the scene model
- Additional adapters (Vue, Svelte, Web Components)

## License

MIT © Marcus Schimizzi
