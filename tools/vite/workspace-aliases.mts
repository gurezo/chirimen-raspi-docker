import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** bare package name → lib ソース入口（統合型モノレポ向け） */
export const workspaceLibAliases = {
  core: resolve(workspaceRoot, 'libs/core/src/index.ts'),
  gpio: resolve(workspaceRoot, 'libs/gpio/src/index.ts'),
  i2c: resolve(workspaceRoot, 'libs/i2c/src/index.ts'),
  protocol: resolve(workspaceRoot, 'libs/protocol/src/index.ts'),
  'node-runtime': resolve(workspaceRoot, 'libs/node-runtime/src/index.ts'),
  'browser-polyfill': resolve(
    workspaceRoot,
    'libs/browser-polyfill/src/index.ts'
  ),
} as const;
