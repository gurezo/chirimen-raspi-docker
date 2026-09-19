import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';

// Nx monorepo root. Distinct from the host Editor directory ./workspace.
const workspaceRoot = resolve(import.meta.dirname, '../..');
const bundleOutFile = resolve(import.meta.dirname, 'dist/polyfill.js');
const samplePolyfills = [
  resolve(workspaceRoot, 'workspace/led-blink/polyfill.js'),
  resolve(workspaceRoot, 'workspace/button/polyfill.js'),
  resolve(workspaceRoot, 'workspace/i2c-scan/polyfill.js'),
  resolve(workspaceRoot, 'workspace/pir-sensor/polyfill.js'),
  resolve(workspaceRoot, 'workspace/adt7410/polyfill.js'),
  resolve(workspaceRoot, 'workspace/sht30/polyfill.js'),
  resolve(workspaceRoot, 'workspace/ads1115/polyfill.js'),
];

function copySamplePolyfills(): Plugin {
  return {
    name: 'copy-sample-polyfills',
    closeBundle() {
      for (const dest of samplePolyfills) {
        copyFileSync(bundleOutFile, dest);
      }
    },
  };
}

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/libs/browser-polyfill-bundle',
  plugins: [copySamplePolyfills()],
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
