# Unit Test 基盤

GPIO / I2C 実機がなくても domain / protocol のロジックを検証できるよう、Nx workspace の unit test 方針を固定する。

## 決定事項

| 項目 | 内容 |
| --- | --- |
| Test runner | Vitest |
| Nx executor | `@nx/vite:test` |
| テストファイル | 各 lib の `src/**/*.{test,spec}.ts` |
| 設定ファイル | 各 project の `vite.config.mts` |
| ローカル / CI 共通入口 | `pnpm test` |

Jest は導入しない。既存の `@nx/vite:test` と Vitest を正式な基盤とする。

## 対象 project

`test` target を持つ project（現行）:

| Project | Path |
| --- | --- |
| `core` | `libs/core` |
| `gpio` | `libs/gpio` |
| `i2c` | `libs/i2c` |
| `protocol` | `libs/protocol` |
| `node-runtime` | `libs/node-runtime` |
| `browser-polyfill` | `libs/browser-polyfill` |

新規 lib を追加するときは、同様に `vite.config.mts`・`tsconfig.spec.json`・`project.json` の `test` target を揃える。

workspace 依存（例: `node-runtime` → `core` / `gpio` / `i2c`）を import する lib の Vitest 設定では、`resolve.conditions` / `ssr.resolve.conditions` に `chirimen-raspi-docker` を指定する。`package.json` exports の当該条件が `./src/index.ts` を指すため、CI で `dist` 未生成でも解決できる。

## 実行方法

全 project の test:

```bash
pnpm test
```

内部では `nx run-many -t test` を実行する。単一 project のみ確認する場合:

```bash
pnpm nx test core
pnpm nx test gpio
pnpm nx test i2c
pnpm nx test protocol
pnpm nx test node-runtime
pnpm nx test browser-polyfill
```

## CI

GitHub Actions（`.github/workflows/ci.yml`）でも同じ `pnpm test` を実行する。
