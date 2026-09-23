/// <reference types='vitest' />
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/catalog',
  plugins: [tailwindcss()],
  server: {
    port: 4200,
    host: 'localhost',
  },
  preview: {
    port: 4274,
    host: 'localhost',
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
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/catalog',
      provider: 'v8' as const,
    },
  },
  resolve: {
    alias: {
      '@inventory': resolve(
        import.meta.dirname,
        '../../docs/examples/legacy-inventory.json'
      ),
    },
  },
}));
