/// <reference types='vitest' />
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/libs/node-runtime',
  // workspace packages export source via customConditions (tsconfig.base.json)
  resolve: {
    conditions: ['chirimen-raspi-docker'],
  },
  ssr: {
    resolve: {
      conditions: ['chirimen-raspi-docker'],
    },
  },
  test: {
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/node-runtime',
      provider: 'v8' as const,
    },
  },
}));
