/// <reference types='vitest' />
import { defineConfig } from 'vite';
import { workspaceLibAliases } from '../../tools/vite/workspace-aliases.mts';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/libs/protocol',
  resolve: {
    alias: workspaceLibAliases,
  },
  test: {
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/protocol',
      provider: 'v8' as const,
    },
  },
}));
