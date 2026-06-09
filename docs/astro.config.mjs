// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  // Serves at the root locally; the deploy workflow sets SITE_URL / BASE_PATH
  // for the GitHub Pages project site (e.g. base "/chartistry").
  site: process.env.SITE_URL ?? 'https://example.com',
  base: process.env.BASE_PATH ?? '/',
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
          items: [{ label: 'Bar chart', slug: 'examples/bar-chart' }],
        },
        {
          label: 'Concepts',
          items: [{ label: 'Architecture', slug: 'concepts/architecture' }],
        },
      ],
    }),
  ],
});
