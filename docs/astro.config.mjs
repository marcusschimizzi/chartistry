// @ts-check
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import { createStarlightTypeDocPlugin } from 'starlight-typedoc';

/** Resolve @chartistry/* to source, so the docs (gallery + examples) bundle from
 * the workspace source rather than each package's built dist. Keeps dev HMR live
 * and avoids a stale-dist coupling on build. */
const pkg = (/** @type {string} */ name) =>
  fileURLToPath(new URL(`../packages/${name}/src/index.ts`, import.meta.url));
const chartistryAliases = {
  '@chartistry/core': pkg('core'),
  '@chartistry/renderer-svg': pkg('renderer-svg'),
  '@chartistry/renderer-canvas': pkg('renderer-canvas'),
  '@chartistry/react': pkg('react'),
};

// One TypeDoc instance per published package, so each gets its own API section
// generated from the package's TSDoc comments and source types.
const [coreTypeDoc, coreTypeDocSidebar] = createStarlightTypeDocPlugin();
const [svgTypeDoc, svgTypeDocSidebar] = createStarlightTypeDocPlugin();
const [canvasTypeDoc, canvasTypeDocSidebar] = createStarlightTypeDocPlugin();
const [reactTypeDoc, reactTypeDocSidebar] = createStarlightTypeDocPlugin();

/** Shared TypeDoc options. The base tsconfig maps @chartistry/* to source, so
 * cross-package types resolve without a build. */
const typeDocOptions = {
  tsconfig: './typedoc.tsconfig.json',
  typeDoc: {
    skipErrorChecking: true,
    excludeInternal: true,
    expandObjects: true,
    useCodeBlocks: true,
    parametersFormat: /** @type {const} */ ('table'),
  },
};

// https://astro.build/config
export default defineConfig({
  // Serves at the root locally; the deploy workflow sets SITE_URL / BASE_PATH
  // for the GitHub Pages project site (e.g. base "/chartistry").
  site: process.env.SITE_URL ?? 'https://example.com',
  base: process.env.BASE_PATH ?? '/',
  vite: {
    resolve: { alias: chartistryAliases },
  },
  integrations: [
    react(),
    starlight({
      title: 'Chartistry',
      description:
        'A composable, framework-agnostic, renderer-pluggable charting library for the web.',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/marcusschimizzi/chartistry',
        },
      ],
      plugins: [
        coreTypeDoc({
          ...typeDocOptions,
          entryPoints: ['../packages/core/src/index.ts'],
          output: 'api/core',
          sidebar: { label: '@chartistry/core', collapsed: true },
        }),
        svgTypeDoc({
          ...typeDocOptions,
          entryPoints: ['../packages/renderer-svg/src/index.ts'],
          output: 'api/renderer-svg',
          sidebar: { label: '@chartistry/renderer-svg', collapsed: true },
        }),
        canvasTypeDoc({
          ...typeDocOptions,
          entryPoints: ['../packages/renderer-canvas/src/index.ts'],
          output: 'api/renderer-canvas',
          sidebar: { label: '@chartistry/renderer-canvas', collapsed: true },
        }),
        reactTypeDoc({
          ...typeDocOptions,
          entryPoints: ['../packages/react/src/index.ts'],
          output: 'api/react',
          sidebar: { label: '@chartistry/react', collapsed: true },
        }),
      ],
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'Introduction', slug: 'index' },
            { label: 'Getting started', slug: 'guides/getting-started' },
          ],
        },
        {
          label: 'Examples',
          items: [
            { label: 'Bar chart', slug: 'examples/bar-chart' },
            { label: 'Line & area', slug: 'examples/line-and-area' },
            { label: 'Multi-series time series', slug: 'examples/time-series' },
            { label: 'Grouped bars', slug: 'examples/grouped-bars' },
            { label: 'Bubble & scatter', slug: 'examples/bubble-chart' },
            { label: 'Pie & donut', slug: 'examples/pie-and-donut' },
            { label: 'Canvas renderer', slug: 'examples/canvas-renderer' },
          ],
        },
        {
          label: 'Concepts',
          items: [{ label: 'Architecture', slug: 'concepts/architecture' }],
        },
        {
          label: 'API Reference',
          items: [
            coreTypeDocSidebar,
            reactTypeDocSidebar,
            svgTypeDocSidebar,
            canvasTypeDocSidebar,
          ],
        },
      ],
    }),
  ],
});
