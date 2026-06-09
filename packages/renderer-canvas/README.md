# @chartistry/renderer-canvas

Canvas 2D renderer backend for [Chartistry](https://github.com/marcusschimizzi/chartistry).
It paints a `@chartistry/core` scene graph onto an HTML `<canvas>`, repainting interpolated
frames so transitions animate the same way they do on the SVG backend — the same scene
renders identically on either.

## Install

```bash
npm install @chartistry/renderer-canvas @chartistry/core
```

## Usage

```ts
import { createCanvasRenderer } from '@chartistry/renderer-canvas';

const renderer = createCanvasRenderer({ pixelRatio: window.devicePixelRatio });
const handle = renderer.mount(hostElement, { width: 320, height: 200 });
handle.render(scene); // a scene graph from @chartistry/core
```

With React, pass it as the `renderer` prop to `<Chart>` from `@chartistry/react` to switch
the backend at runtime.

## License

MIT
