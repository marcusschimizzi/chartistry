# @chartistry/react

React adapter for [Chartistry](https://github.com/marcusschimizzi/chartistry): composable
`<Chart>` components over the framework-agnostic core and pluggable renderers.

Child marks describe _what_ to draw; the active renderer decides _how_, which is what keeps
the SVG and Canvas backends interchangeable. Charts are interactive and accessible by
default (figure role, hidden data table, keyboard navigation, an `aria-live` announcer).

## Install

```bash
npm install @chartistry/react @chartistry/core @chartistry/renderer-svg
```

`react` and `react-dom` (>=18) are peer dependencies.

## Usage

```tsx
import { Chart, Bars, XAxis, YAxis, Tooltip } from '@chartistry/react';

function Example() {
  const data = [
    { name: 'A', value: 30 },
    { name: 'B', value: 80 },
    { name: 'C', value: 45 },
  ];
  return (
    <Chart
      width={480}
      height={280}
      data={data}
      x={(d) => d.name}
      y={(d) => d.value}
      xScaleType="band"
      title="Demo"
    >
      <YAxis />
      <XAxis />
      <Bars />
      <Tooltip />
    </Chart>
  );
}
```

Swap renderers at runtime by passing a different `renderer` (e.g.
`createCanvasRenderer()` from `@chartistry/renderer-canvas`) to `<Chart>`.

## License

MIT
