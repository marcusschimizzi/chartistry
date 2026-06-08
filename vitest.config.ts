import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@chartistry/core': r('./packages/core/src/index.ts'),
      '@chartistry/renderer-svg': r('./packages/renderer-svg/src/index.ts'),
      '@chartistry/renderer-canvas': r('./packages/renderer-canvas/src/index.ts'),
      '@chartistry/react': r('./packages/react/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['packages/**/*.{test,spec}.{ts,tsx}'],
    globals: false,
  },
});
