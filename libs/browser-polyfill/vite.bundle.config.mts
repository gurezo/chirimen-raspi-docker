import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const workspaceRoot = resolve(import.meta.dirname, '../..');

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/libs/browser-polyfill-bundle',
  resolve: {
    alias: {
      core: resolve(workspaceRoot, 'libs/core/src/index.ts'),
      gpio: resolve(workspaceRoot, 'libs/gpio/src/index.ts'),
      i2c: resolve(workspaceRoot, 'libs/i2c/src/index.ts'),
      protocol: resolve(workspaceRoot, 'libs/protocol/src/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: false,
    minify: true,
    target: 'es2022',
    lib: {
      entry: resolve(import.meta.dirname, 'src/polyfill.entry.ts'),
      name: 'ChirimenPolyfill',
      formats: ['iife'],
      fileName: () => 'polyfill.js',
    },
  },
});
