/// <reference types='vitest' />
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const workspaceRoot = resolve(import.meta.dirname, '../..');

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/web-demo',
  server: {
    port: 4200,
    host: 'localhost',
  },
  preview: {
    port: 4300,
    host: 'localhost',
  },
  resolve: {
    alias: {
      core: resolve(workspaceRoot, 'libs/core/src/index.ts'),
      gpio: resolve(workspaceRoot, 'libs/gpio/src/index.ts'),
      i2c: resolve(workspaceRoot, 'libs/i2c/src/index.ts'),
      protocol: resolve(workspaceRoot, 'libs/protocol/src/index.ts'),
      'node-runtime': resolve(workspaceRoot, 'libs/node-runtime/src/index.ts'),
      'browser-polyfill': resolve(
        workspaceRoot,
        'libs/browser-polyfill/src/index.ts'
      ),
    },
  },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
  },
  test: {
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/web-demo',
      provider: 'v8' as const,
    },
  },
}));
