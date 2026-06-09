# @chartistry/renderer-svg

SVG renderer backend for [Chartistry](https://github.com/marcusschimizzi/chartistry). It
paints a `@chartistry/core` scene graph into DOM SVG elements, reusing elements by `key`
across frames so updates diff in place and transitions animate smoothly.

## Install

```bash
npm install @chartistry/renderer-svg @chartistry/core
```

## Usage

```ts
import { createSvgRenderer } from '@chartistry/renderer-svg';

const renderer = createSvgRenderer();
const handle = renderer.mount(hostElement, { width: 320, height: 200 });
handle.render(scene); // a scene graph from @chartistry/core
```

With React, pass it as the `renderer` prop to `<Chart>` from `@chartistry/react` (it's the
default backend).

## License

MIT
