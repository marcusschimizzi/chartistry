---
title: Architecture
description: How a Chartistry chart flows from data to pixels.
---

A chart in Chartistry is a _spec_ that becomes a renderer-agnostic **scene graph**,
which any backend can paint:

```
data ──▶ scales ──▶ marks ──▶ scene graph ──▶ renderer ──▶ pixels
              ▲                            ▲
       composable pieces            swappable backend
```

## The pieces

- **Scales** map abstract data values to visual positions — linear, band,
  ordinal/color, and time (with calendar-aware ticks plus UTC and locale formatting).
- **Marks** turn data and scales into scene nodes: line/area, points, bars (vertical
  and horizontal, grouped and stacked), pie/donut, axes, grid, and crosshair.
- **The scene graph** is the small, declarative intermediate representation between
  chart logic and any concrete renderer. It has no notion of SVG, Canvas, or the DOM.
- **Renderers** walk the scene graph and paint it. `@chartistry/renderer-svg` diffs it
  into SVG DOM by `key`; `@chartistry/renderer-canvas` repaints it onto a 2D context.
  A shared, backend-agnostic transition animator makes both animate alike.

## Why this shape

Keeping the core free of the DOM and of any framework is what lets the same chart
render through completely different backends, and what makes interaction
(hit-testing) and transitions live in one place rather than being reimplemented per
renderer. The React adapter (`@chartistry/react`) is a thin, declarative layer that
wires scales and marks together and hosts the active renderer.
