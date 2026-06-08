import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Alias workspace packages straight to their source so the playground gets
// instant HMR across the whole library without a build step in between.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@chartistry/core': r('../packages/core/src/index.ts'),
      '@chartistry/renderer-svg': r('../packages/renderer-svg/src/index.ts'),
      '@chartistry/renderer-canvas': r('../packages/renderer-canvas/src/index.ts'),
      '@chartistry/react': r('../packages/react/src/index.ts'),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
