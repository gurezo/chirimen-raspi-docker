# Nx project tags / module boundaries

Wiki [`01.Development-Concept`](https://github.com/gurezo/chirimen-raspi-docker/wiki/01.Development-Concept) で定義した library / application の責務を、Nx project tags で表現する。

本ドキュメントは tags の命名規則と現行・将来 project への割当を記録する。`@nx/enforce-module-boundaries` による依存制約の詳細は Issue #12 で追加する。

## 目的

- 各 project の責務（app / lib、shared / hardware / runtime など）をコード上で可視化する
- 後続の module boundary 設定（#12）で禁止依存を lint 検出できるようにする準備をする

## Tag 次元

| 次元 | 意味 | 例 |
| --- | --- | --- |
| `type` | project 種別 | `type:app`, `type:lib` |
| `scope` | 責務領域 | `scope:server`, `scope:shared`, `scope:hardware`, `scope:runtime` |
| `layer` | 層（主に lib） | `layer:core`, `layer:domain`, `layer:protocol` |
| `platform` | 実行環境 | `platform:node`, `platform:browser` |

命名は `次元:値` 形式とする。Issue 本文の「application/server/node」などは説明用であり、実装・文書では上記プレフィックス付き tag を使う。

## 現行 project の tags

| Project | Path | tags |
| --- | --- | --- |
| `server` | `apps/server` | `type:app`, `scope:server`, `platform:node` |
| `core` | `libs/core` | `type:lib`, `scope:shared`, `layer:core` |
| `gpio` | `libs/gpio` | `type:lib`, `scope:hardware`, `layer:domain` |
| `i2c` | `libs/i2c` | `type:lib`, `scope:hardware`, `layer:domain` |
| `node-runtime` | `libs/node-runtime` | `type:lib`, `scope:runtime`, `platform:node` |

tags は各 `project.json` の `tags` 配列に設定する。

## 今後作成する project の予定 tags

| Project | Path（予定） | tags |
| --- | --- | --- |
| `protocol` | `libs/protocol` | `type:lib`, `scope:shared`, `layer:protocol` |
| `browser-polyfill` | `libs/browser-polyfill` | `type:lib`, `scope:polyfill`, `platform:browser` |
| `web-demo` | `apps/web-demo` | `type:app`, `scope:demo`, `platform:browser` |

新規 project を追加するときは、この表に沿って `project.json` の `tags` を設定し、必要なら本表も更新する。

## 確認方法

```bash
pnpm nx show projects
pnpm nx show project server --json
pnpm nx show project core --json
pnpm nx show project gpio --json
pnpm nx show project i2c --json
pnpm nx show project node-runtime --json
pnpm nx graph
```

`pnpm nx show project <name> --json` の `tags` に期待値が含まれること、`pnpm nx graph` で project 関係を確認できることを完了条件とする。

## Module boundary について

依存方向の禁止ルール（例: `browser-polyfill` → `node-runtime` の禁止、domain lib → application の禁止）は、本ドキュメントの tags を前提に Issue #12 で `eslint.config.mjs` の `depConstraints` へ反映する。
