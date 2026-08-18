# Architecture overview

Wiki の設計意図と、実装後のリポジトリ構造をまとめる。

関連:

- 親 Issue: [#6 Phase 6: CI, Documentation and Release](https://github.com/gurezo/chirimen-raspi-docker/issues/6)
- 子 Issue: [#45 Architecture / Guide docs を整備する](https://github.com/gurezo/chirimen-raspi-docker/issues/45)
- Wiki: [01.Development-Concept](https://github.com/gurezo/chirimen-raspi-docker/wiki/01.Development-Concept)
- Wiki: [00.Current-situation-analysis](https://github.com/gurezo/chirimen-raspi-docker/wiki/00.Current-situation-analysis)

## 目的

Raspberry Pi 3 / 4 / 5 上で、次の操作だけで CHIRIMEN 開発を始められる Runtime を提供する。

```text
git clone
./scripts/start.sh
```

既存 CHIRIMEN の Web GPIO / Web I2C 風の開発体験を維持しつつ、実装を TypeScript / Nx / Docker ベースに再構築する。

## 背景（旧構成）

従来はブラウザ側の `polyfill.js` と Raspberry Pi 側の `srv.js` が WebSocket 経由で通信し、GPIO / I2C を操作していた。

```text
Browser JavaScript
  ↓ navigator.requestGPIOAccess() / navigator.requestI2CAccess()
polyfill.js
  ↓ WebSocket
srv.js
  ↓ onoff / i2c-bus
Raspberry Pi GPIO / I2C
```

課題の例:

- JavaScript 実装で型安全性が弱い
- `srv.js` に責務が集中している
- `polyfill.js` と `srv.js` の通信仕様が分かりにくい
- カスタムイメージ / `setup.sh` / `release.sh` による環境構築・配布の負担が大きい

本リポジトリではそのまま移植するのではなく、責務を分割したうえで再設計する。

## 現行アーキテクチャ

```text
Browser
  ↓
libs/browser-polyfill
  ↓ WebSocket（libs/protocol の JSON メッセージ）
apps/server
  ↓
libs/node-runtime
  ↓
node-web-gpio / node-web-i2c
  ↓
Raspberry Pi GPIO / I2C
```

Browser と Node Runtime の間の通信契約は `libs/protocol` に集約する。`browser-polyfill` と `node-runtime` は直接依存しない。

## 技術スタック

| 項目 | 技術 |
| --- | --- |
| Monorepo | Nx（統合型。`apps/*` / `libs/*` に個別 `package.json` は無い） |
| Language | TypeScript |
| Package manager | pnpm |
| Runtime | Node.js |
| GPIO | node-web-gpio |
| I2C | node-web-i2c |
| HTTP | Express |
| Realtime | WebSocket (`ws`) |
| Container | Docker / Docker Compose |
| Docs | Typedoc + `docs/architecture` / `docs/guides` |

## 対応対象

OS / kernel / architecture / GPIO capability / Runtime backend / Browser E2E の検証状態は [Compatibility matrix](./compatibility.md) を参照。

サポート対象は **Raspberry Pi 3 B+ / 4 / 5** の **Raspbian OS 64-bit** である。

### 対応

- Raspberry Pi 3 B+（Raspbian OS 64-bit）
- Raspberry Pi 4（Raspbian OS 64-bit）
- Raspberry Pi 5（Raspbian OS 64-bit）

### 未検証 / サポート対象外

- Raspberry Pi 3 A+（ハードウェアスペック不足のためサポート対象外）
- 32-bit OS（サポート対象外。Runtime と Editor を同じ手順では保証しない）

### 非対応（現時点）

- Orange Pi / Banana Pi / Jetson / Rock Pi など他の SBC

## リポジトリ構成（現状）

```text
chirimen-raspi-docker/
├── apps/
│   ├── server/                 # Express + WebSocket server
│   └── web-demo/               # Browser demo（Polyfill / 接続状態 UI / GPIO・I2C ナビ）
├── libs/
│   ├── core/                   # 共通エラー / 型
│   ├── gpio/                   # Web GPIO 風 domain（型・契約）
│   ├── i2c/                    # Web I2C 風 domain（型・契約）
│   ├── protocol/               # Browser ↔ Server 通信契約
│   ├── node-runtime/           # node-web-gpio / node-web-i2c adapter
│   └── browser-polyfill/       # navigator.request*Access polyfill
├── docker/
│   ├── editor/
│   │   └── Dockerfile          # code-server 4.132.0（amd64 / arm64）
│   ├── web-demo/
│   │   └── Dockerfile          # Vite production build + nginx（port 4200、#180）
│   └── server/
│       ├── Dockerfile          # 64-bit（Node 24）
│       └── Dockerfile.32bit    # 32-bit（Node 22）。サポート対象外。削除はしない
├── scripts/
│   ├── doctor.sh
│   ├── start.sh
│   ├── enable-i2c.sh
│   └── build-server.mjs        # 32-bit Docker 用 esbuild bundle
├── setups/                     # host の Docker / Docker Compose 環境構築
│   ├── docker.sh
│   ├── docker-compose.sh
│   └── README.md
├── docs/
│   ├── architecture/
│   ├── guides/
│   ├── examples/               # GPIO LED Blink / GPIO Input / I2C Scan 回路・検証仕様・HTML サンプル（#105 / #108 / #109 / #113 / #116 / #117）
│   └── api/                    # Typedoc 生成物（git 管理外）
├── compose.yaml                # chirimen-server（既定）+ chirimen-editor / chirimen-web-demo（profile `editor`、#177 / #180）
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

未実装（予定）:

- `docker/nginx`

## apps / libs の責務

| Path | 責務 |
| --- | --- |
| `apps/server` | Express / WebSocket の起動、protocol decode / encode、`node-runtime` への委譲、health check |
| `apps/web-demo` | Browser から Runtime を試す demo UI（Browser Polyfill 組み込み済み。接続状態 UI、GPIO Output の LED Blink Start / Stop、GPIO Input の Start / Stop / Read / onchange realtime、I2C Scan の Scan / hex 一覧） |
| `libs/core` | 共通エラー（`ChirimenError` など）と共有型 |
| `libs/gpio` | Web GPIO 風の抽象・型（実装は持たない） |
| `libs/i2c` | Web I2C 風の抽象・型（CHIRIMEN 互換の raw byte API を含む） |
| `libs/protocol` | request / response / event、GPIO / I2C operations、encode / decode |
| `libs/node-runtime` | `node-web-gpio` / `node-web-i2c` の wrapper、session / scan |
| `libs/browser-polyfill` | `navigator.requestGPIOAccess` / `requestI2CAccess`、WebSocket client |

依存の詳細と ESLint 制約は [nx-boundaries.md](./nx-boundaries.md) を参照。

## Docker と scripts

- 推奨起動入口は `scripts/start.sh`（host に存在する GPIO / I2C device だけを capability-aware に渡す。既定は Runtime only。`--editor` で `chirimen-editor` と `chirimen-web-demo` も起動する。サポート対象は 64-bit OS）
- ベース定義は root の `compose.yaml`（`chirimen-server` は `/sys/class/gpio` と `/sys/devices` を常時 mount。`chirimen-editor` と `chirimen-web-demo` は Compose profile `editor`。GPIO / I2C は渡さない）
- GPIO / I2C は `privileged: true` を使わず device / volume mount で通す（Editor / Web Demo には付けない）
- host 事前確認は `scripts/doctor.sh`、I2C 有効化は `scripts/enable-i2c.sh`

詳細は [docker.md](./docker.md) と [guides](../guides/getting-started.md) を参照。

## Nx MCP (Cursor)

Cursor で Nx workspace の context を AI agent に提供するため、`.cursor/mcp.json` に Nx MCP 設定を含めている。

1. Cursor Settings → MCP で `nx-mcp` が有効になっていることを確認する
2. 反映されない場合は Cursor を再起動する
3. 以下で MCP コマンドが利用可能か確認できる

```sh
npx nx mcp --help
```

## 関連ドキュメント

| ドキュメント | 内容 |
| --- | --- |
| [protocol.md](./protocol.md) | Protocol メッセージモデル・wire format・GPIO / I2C operations・[I2C Scan API flow](./protocol.md#i2c-scan-api-flow114) |
| [docker.md](./docker.md) | Docker / Compose / device mount |
| [compatibility.md](./compatibility.md) | Compatibility matrix（Pi 3 B+ / 4 / 5 の 64-bit 実機検証。32-bit OS はサポート対象外） |
| [browser-editor.md](./browser-editor.md) | Phase 8 Browser Editor 選定（code-server、arm64。image は #174。Compose は #175。optional profile は #177。初期設定 / extension は #178。Example 編集は #179） |
| [nx-boundaries.md](./nx-boundaries.md) | Nx tags と module boundaries |
| [unit-test.md](./unit-test.md) | Vitest / Nx unit test 方針 |
| [Raspberry Pi setup](../guides/raspberry-pi-setup.md) | clone と Pi 上のセットアップ |
| [Getting Started](../guides/getting-started.md) | 初回起動手順 |
| [GPIO LED Blink](../guides/gpio-led-blink.md) | 必要部品・配線・HTML サンプルでの点滅手順 |
| [GPIO LED Blink 回路仕様](../examples/gpio-led-blink.md) | BCM 26 / 物理 pin 37 / LED + 330Ω |
| [GPIO Input](../guides/gpio-input.md) | 必要部品・配線・HTML サンプルでの入力確認手順 |
| [GPIO Input 回路仕様](../examples/gpio-input.md) | BCM 5 / 物理 pin 29 / タクトスイッチ + 10kΩ プルアップ |
| [I2C Scan](../guides/i2c-scan.md) | I2C 有効化・配線・HTML サンプル / web-demo での address scan 手順 |
| [I2C Scan 検証仕様](../examples/i2c-scan.md) | ADT7410 / `0x48` / I2C1（物理 pin 3 / 5）。[#116](https://github.com/gurezo/chirimen-raspi-docker/issues/116) |
| [Troubleshooting](../guides/troubleshooting.md) | よくある障害 |

公開 TypeScript API のリファレンスは [API docs](https://gurezo.github.io/chirimen-raspi-docker/api/)（ローカル生成は `pnpm docs:api`、出力先 `docs/api/`、git 管理外）。
Documentation ポータル: https://gurezo.github.io/chirimen-raspi-docker/
