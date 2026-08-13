import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadPathAliases() {
  const tsconfigPath = path.join(repoRoot, 'tsconfig.base.json');
  const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
  const paths = tsconfig.compilerOptions?.paths ?? {};
  /** @type {Record<string, string>} */
  const alias = {};

  for (const [specifier, targets] of Object.entries(paths)) {
    if (specifier.includes('*') || !Array.isArray(targets) || !targets[0]) {
      continue;
    }
    alias[specifier] = path.join(repoRoot, targets[0]);
  }

  return alias;
}

await build({
  absWorkingDir: repoRoot,
  entryPoints: [path.join(repoRoot, 'apps/server/src/main.ts')],
  outfile: path.join(repoRoot, 'apps/server/dist/main.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  sourcemap: false,
  alias: loadPathAliases(),
  tsconfig: path.join(repoRoot, 'apps/server/tsconfig.bundle.json'),
  logLevel: 'info',
});
