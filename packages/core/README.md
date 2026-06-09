# @chartistry/core

Framework-agnostic, renderer-pluggable core for [Chartistry](https://github.com/marcusschimizzi/chartistry).

A chart is a _spec_ that becomes a renderer-agnostic **scene graph**, which any backend can paint:

```
data ──▶ scales ──▶ marks ──▶ scene graph ──▶ renderer ──▶ pixels
```

This package has no DOM and no framework dependency. It provides scales (linear, band,
ordinal/color, time with UTC + locale formatting), the scene graph and marks (line/area,
bars, pie/donut, axes, grid, crosshair), layout, hit-testing, and a backend-agnostic
transition animator. Pair it with a renderer (`@chartistry/renderer-svg` or
`@chartistry/renderer-canvas`) and, optionally, the `@chartistry/react` adapter.

## Install

```bash
npm install @chartistry/core
```

## Usage

```ts
import { createChart, lineMark, linearScale } from '@chartistry/core';

const chart = createChart({ width: 320, height: 200, margin: 24 });
const x = linearScale({ domain: [0, 10], range: [0, chart.plot.width] });
const y = linearScale({ domain: [0, 100], range: [chart.plot.height, 0] });

const scene = chart.compose([
  lineMark({ data, x: (d) => x(d.t), y: (d) => y(d.v), xScale: x, yScale: y }),
]);
// hand `scene` to a renderer to paint it
```

## License

MIT
