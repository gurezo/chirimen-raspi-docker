# Nx project tags / module boundaries

Wiki [`01.Development-Concept`](https://github.com/gurezo/chirimen-raspi-docker/wiki/01.Development-Concept) で定義した library / application の責務を、Nx project tags と `@nx/enforce-module-boundaries` の `depConstraints` で表現する。

本ドキュメントは tags の命名規則・現行/将来 project への割当、および ESLint による依存制約を記録する。

## 目的

- 各 project の責務（app / lib、shared / hardware / runtime など）をコード上で可視化する
- Wiki で禁止した依存（例: `browser-polyfill` → `node-runtime`）を CI / `pnpm lint` で検出する

## Naming Policy（apps）

Nx application 名は実装形態ではなく責務を表す（[#363](https://github.com/gurezo/chirimen-raspi-docker/issues/363)）。

| Nx application | Path（現行 / 将来） | Docker / Service | Access name | Role |
| --- | --- | --- | --- | --- |
| `runtime` | `apps/runtime` | `chirimen-runtime` | `runtime` | Hardware Runtime / WebSocket |
| `editor` | （将来 `apps/editor`。現状は Docker のみ） | `chirimen-editor` | `editor` | Browser Editor |
| `examples` | （将来 `apps/examples`。現状は Docker / `workspace`） | `chirimen-examples` | `example` | Runtime Examples |
| `catalog` | `apps/catalog` | `chirimen-example-catalog` | `catalog` | Example Catalog |

現行 Nx アプリは `runtime` と `catalog` のみである。

## Tag 次元

| 次元 | 意味 | 例 |
| --- | --- | --- |
| `type` | project 種別 | `type:app`, `type:lib` |
| `scope` | 責務領域 | `scope:runtime`, `scope:catalog`, `scope:shared`, `scope:hardware`, `scope:node-runtime` |
| `layer` | 層（主に lib） | `layer:core`, `layer:domain`, `layer:protocol` |
| `platform` | 実行環境 | `platform:node`, `platform:browser` |

命名は `次元:値` 形式とする。Issue 本文の「application/server/node」などは説明用であり、実装・文書では上記プレフィックス付き tag を使う。

`scope:runtime` は Hardware Runtime **app**（`apps/runtime`）用、`scope:node-runtime` は **lib**（`libs/node-runtime`）用である。同じ `scope:runtime` を両方に付けると `depConstraints` が衝突するため分離する。

## 現行 project の tags

| Project | Path | tags |
| --- | --- | --- |
| `runtime` | `apps/runtime` | `type:app`, `scope:runtime`, `platform:node` |
| `core` | `libs/core` | `type:lib`, `scope:shared`, `layer:core` |
| `gpio` | `libs/gpio` | `type:lib`, `scope:hardware`, `layer:domain` |
| `i2c` | `libs/i2c` | `type:lib`, `scope:hardware`, `layer:domain` |
| `protocol` | `libs/protocol` | `type:lib`, `scope:shared`, `layer:protocol` |
| `node-runtime` | `libs/node-runtime` | `type:lib`, `scope:node-runtime`, `platform:node` |
| `browser-polyfill` | `libs/browser-polyfill` | `type:lib`, `scope:polyfill`, `platform:browser` |
| `catalog` | `apps/catalog` | `type:app`, `scope:catalog`, `platform:browser` |

tags は各 `project.json` の `tags` 配列に設定する。新規 project を追加するときは、この表に沿って `project.json` の `tags` を設定し、必要なら本表も更新する。

## 依存方向（Wiki）

許可する依存方向は次のとおり。

```text
apps/runtime
  → libs/node-runtime
  → libs/protocol
  → libs/gpio
  → libs/i2c
  → libs/core

libs/browser-polyfill
  → libs/protocol
  → libs/gpio
  → libs/i2c
  → libs/core

apps/catalog
  → （lib 依存なし。inventory JSON と Device fetch のみ）

libs/node-runtime
  → libs/gpio
  → libs/i2c
  → libs/core

libs/protocol → libs/core
libs/gpio → libs/core
libs/i2c → libs/core
```

禁止する依存の例:

```text
libs/core → 他 lib
libs/gpio / libs/i2c / libs/protocol → apps/*
libs/browser-polyfill → libs/node-runtime
libs/node-runtime → libs/browser-polyfill
platform:browser ↔ platform:node の直接依存
```

## Module boundary（depConstraints）

ルート [`eslint.config.mjs`](../../eslint.config.mjs) の `@nx/enforce-module-boundaries` に、次の `depConstraints` を設定する。Nx はマッチした制約をすべて満たす必要がある。

| sourceTag | 制約 | 意図 |
| --- | --- | --- |
| `type:app` | `onlyDependOnLibsWithTags: ['type:lib']` | app → app を禁止 |
| `type:lib` | `notDependOnLibsWithTags: ['type:app']` | domain/shared/runtime → application を禁止 |
| `platform:browser` | `notDependOnLibsWithTags: ['platform:node']` | Browser-only → Node-only を禁止 |
| `platform:node` | `notDependOnLibsWithTags: ['platform:browser']` | Node-only → Browser-only を禁止 |
| `layer:core` | `onlyDependOnLibsWithTags: []` | `core` は他 lib に依存しない |
| `layer:domain` | `onlyDependOnLibsWithTags: ['layer:core']` | `gpio` / `i2c` → `core` のみ |
| `layer:protocol` | `onlyDependOnLibsWithTags: ['layer:core']` | `protocol` → `core` のみ |
| `scope:node-runtime` | `onlyDependOnLibsWithTags: ['layer:domain', 'layer:core']` | `node-runtime` → `gpio` / `i2c` / `core` |
| `scope:polyfill` | `onlyDependOnLibsWithTags: ['layer:protocol', 'layer:domain', 'layer:core']` かつ `notDependOnLibsWithTags: ['scope:node-runtime', 'platform:node']` | `browser-polyfill` → `node-runtime` を禁止 |
| `scope:runtime` | `onlyDependOnLibsWithTags: ['scope:node-runtime', 'scope:shared', 'scope:hardware', 'layer:protocol', 'layer:domain', 'layer:core']` | Wiki の runtime app 許可依存 |
| `scope:catalog` | `onlyDependOnLibsWithTags: []` かつ `notDependOnLibsWithTags: ['scope:polyfill', 'scope:hardware', 'scope:node-runtime']` | Catalog は hardware / polyfill に依存しない |

## 確認方法

### tags

```bash
pnpm nx show projects
pnpm nx show project runtime --json
pnpm nx show project core --json
pnpm nx show project gpio --json
pnpm nx show project i2c --json
pnpm nx show project protocol --json
pnpm nx show project node-runtime --json
pnpm nx show project browser-polyfill --json
pnpm nx show project catalog --json
pnpm nx graph
```

`pnpm nx show project <name> --json` の `tags` に期待値が含まれること、`pnpm nx graph` で project 関係を確認できることを確認する。

### module boundary

```bash
pnpm lint
```

意図的に禁止 import（例: `libs/gpio` から `runtime` や `node-runtime` を import）を追加すると lint が失敗し、削除すると成功することを確認する。
