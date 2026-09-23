# Architecture overview

Wiki の設計意図と、実装後のリポジトリ構造をまとめる。

関連:

- 親 Issue: [#6 Phase 6: CI, Documentation and Release](https://github.com/gurezo/chirimen-raspi-docker/issues/6)
- 子 Issue: [#45 Architecture / Guide docs を整備する](https://github.com/gurezo/chirimen-raspi-docker/issues/45)
- Wiki: [01.Development-Concept](https://github.com/gurezo/chirimen-raspi-docker/wiki/01.Development-Concept)
- Wiki: [00.Current-situation-analysis](https://github.com/gurezo/chirimen-raspi-docker/wiki/00.Current-situation-analysis)

## 目的

Raspberry Pi 3 / 4 / 5 上で、CHIRIMEN 開発を始められる Runtime を提供する。Host 準備は [Raspberry Pi Setup](../guides/raspberry-pi-setup.md)（`setups/`）。初心者の Runtime 操作は `docker compose up -d` / `down` である（詳細は [Getting Started](../guides/getting-started.md)）。`./scripts/start.sh` は Development / 上級者向け（device mapping・LAN・on-device build。Pi 3 B+ は `--no-build`）。

```text
./setups/setup.sh               # Beginner / Runtime Host setup
        ↓
docker compose up -d            # Runtime 操作（Pi 3 / 4 / 5 共通。build なし）
        ↓
http://localhost:4200

Development / 上級者:
./scripts/start.sh              # Pi 4 / Pi 5（既定で --build）
  or --no-build                 # Pi 3 B+ Runtime-only
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
apps/runtime
  ↓
libs/node-runtime
  ↓
node-web-gpio / node-web-i2c
  ↓
Raspberry Pi GPIO / I2C
```

Browser と Node Runtime の間の通信契約は `libs/protocol` に集約する。`browser-polyfill` と `node-runtime` は直接依存しない。

Nx application 名は責務ベースとする（[#363](https://github.com/gurezo/chirimen-raspi-docker/issues/363)）。現行は `apps/runtime` と `apps/catalog`。将来の到達イメージは `apps/{runtime,editor,examples,catalog}`（editor / examples は現状 Docker 側のみ）。詳細は [nx-boundaries.md](./nx-boundaries.md#naming-policyapps)。

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

OS / kernel / architecture / GPIO capability / Runtime backend / Browser E2E の検証状態は [Compatibility](./compatibility.md) を参照。

サポート対象は **Raspberry Pi 3 B+ / 4 / 5** の **Raspberry Pi OS 64-bit** である。標準環境は **Raspberry Pi OS 64-bit Desktop**（Lite も可）。Pi 3 B+（RAM 1GB）は下限であり **Runtime-only**（基本体験は Runtime + Example Catalog + GPIO LED Blink / I2C Scan）。code-server（Browser Editor）は任意の高負荷機能とする。Docker build は Pi 4 / Pi 5 のみ（[Compatibility](./compatibility.md)）。`swap.sh` の主用途は Pi 4 / Pi 5 の開発・Docker build（[Raspberry Pi Setup](../guides/raspberry-pi-setup.md#development-only-swapsh)）。

### 対応

- Raspberry Pi 3 B+（Raspberry Pi OS 64-bit。Runtime-only。Docker build は Unsupported。Editor は基本体験に含めない。低メモリ時の Swap は任意）
- Raspberry Pi 4（Raspberry Pi OS 64-bit。Runtime / Development / Docker build）
- Raspberry Pi 5（Raspberry Pi OS 64-bit。Runtime / Development / Docker build）

### 未検証 / サポート対象外

- Raspberry Pi 3 A+（ハードウェアスペック不足のためサポート対象外）
- 32-bit OS は Unsupported です。[Historical: 32-bit Compatibility](./compatibility-32bit.md)

### 非対応（現時点）

- Orange Pi / Banana Pi / Jetson / Rock Pi など他の SBC

## リポジトリ構成（現状）

```text
chirimen-raspi-docker/
├── apps/
│   ├── runtime/                # Hardware Runtime（Express + WebSocket）。#363
│   └── catalog/                # Example Catalog UI（HTML / Vanilla JS / Tailwind。#254 / #255 / #263 / #363）
├── libs/
│   ├── core/                   # 共通エラー / 型
│   ├── gpio/                   # Web GPIO 風 domain（型・契約）
│   ├── i2c/                    # Web I2C 風 domain（型・契約）
│   ├── protocol/               # Browser ↔ Runtime 通信契約
│   ├── node-runtime/           # node-web-gpio / node-web-i2c adapter
│   └── browser-polyfill/       # navigator.request*Access polyfill
├── docker/
│   ├── editor/
│   │   └── Dockerfile          # code-server 4.132.0（amd64 / arm64）
│   ├── example-catalog/
│   │   └── Dockerfile          # Vite production build + nginx（port 4200、#254 / #263）
│   └── server/
│       └── Dockerfile          # 64-bit（Node 24）。唯一の supported path
├── scripts/                    # CHIRIMEN Setup（doctor / start）。build-docs-site.mjs は開発・ドキュメント用
│   ├── README.md
│   ├── doctor.sh               # Host Setup 完了後の読み取り専用診断（setup.sh からも呼ぶ）
│   ├── start.sh                # Development / 上級者向け起動補助（capability-aware。既定 --build）
│   └── build-docs-site.mjs     # 公開 Documentation サイト生成
├── setups/                     # Raspberry Pi Setup / Host 構築（初心者入口は setup.sh。swap は Development-only）
│   ├── setup.sh                # Beginner / Runtime Host orchestration
│   ├── swap.sh                 # Development-only（Pi 4 / Pi 5 の build 向け）
│   ├── enable-i2c.sh
│   ├── disable-squeekboard.sh  # Lite では変更せず終わる（#271 / #278）
│   ├── docker.sh
│   ├── docker-compose.sh
│   └── README.md
├── docs/
│   ├── architecture/
│   ├── guides/
│   ├── examples/               # GPIO / I2C Example 回路・検証仕様（#105 / #108 / #109 / #113 / #116 / #117 / #256）
│   └── api/                    # Typedoc 生成物（git 管理外）
├── workspace/                  # Browser Editor workspace / HTML サンプル（#241）
├── compose.yaml                # chirimen-runtime + chirimen-editor / chirimen-example-server / chirimen-example-catalog / chirimen-gateway（既定で全起動。#175 / #179 / #180 / #208 / #254 / #360）
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

未実装（予定）:

- TLS 終端 reverse proxy（`docker/nginx` の name パス 302 gateway は [#360](https://github.com/gurezo/chirimen-raspi-docker/issues/360) で実装済み。中身の `proxy_pass` / HTTPS は別）

## apps / libs の責務

| Path | 責務 |
| --- | --- |
| `apps/runtime` | Express / WebSocket の起動、protocol decode / encode、`node-runtime` への委譲、health check |
| `apps/catalog` | Example Catalog UI（HTML / Vanilla JS / Tailwind。出典と責務は [catalog.md](../examples/catalog.md)。入口は `:4200`。`legacy-inventory.json` と certified-devices を表示。ported Example は `:4173` 実行と `:8080` 編集。iframe は使わない。#255 / #263 / #363） |
| `libs/core` | 共通エラー（`ChirimenError` など）と共有型 |
| `libs/gpio` | Web GPIO 風の抽象・型（実装は持たない） |
| `libs/i2c` | Web I2C 風の抽象・型（CHIRIMEN 互換の raw byte API を含む） |
| `libs/protocol` | request / response / event、GPIO / I2C operations、encode / decode |
| `libs/node-runtime` | `node-web-gpio` / `node-web-i2c` の wrapper、session / scan |
| `libs/browser-polyfill` | `navigator.requestGPIOAccess` / `requestI2CAccess`、WebSocket client |

依存の詳細と ESLint 制約は [nx-boundaries.md](./nx-boundaries.md) を参照。

## Docker と scripts

- **Raspberry Pi Setup**（Host）の初心者入口は `setups/setup.sh`。I2C 有効化は必要時に `setups/enable-i2c.sh`
- **Runtime 操作**は `docker compose up -d` / `down`（Pi 3 / 4 / 5 共通。build なし）。正本は [Getting Started](../guides/getting-started.md)
- **CHIRIMEN Setup** の診断は `scripts/doctor.sh`（Host 設定は変えない）。`scripts/start.sh` は Development / 上級者向け（host に存在する GPIO / I2C device だけを capability-aware に渡す。既定は 64-bit の全サーバー起動＋`--build`。Pi 3 B+ は `--no-build`。サポート対象は 64-bit OS）
- ベース定義は root の `compose.yaml`（`chirimen-runtime` は `/sys/class/gpio` と `/sys/devices` を常時 mount。`chirimen-editor` / `chirimen-example-server` / `chirimen-example-catalog` も既定で起動する。GPIO / I2C は渡さない）
- GPIO / I2C は `privileged: true` を使わず device / volume mount で通す（Editor / Examples / Catalog には付けない）

詳細は [docker.md](./docker.md) と [Getting Started](../guides/getting-started.md) を参照。

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
| [Compatibility](./compatibility.md) | Compatibility（Pi 3 B+ / 4 / 5 の 64-bit 実機検証。32-bit OS は Unsupported。I2C Host Setup は [#219](https://github.com/gurezo/chirimen-raspi-docker/issues/219)。Browser Development Flow は [#243](https://github.com/gurezo/chirimen-raspi-docker/issues/243)。Example Catalog / Runtime Example は [#257](https://github.com/gurezo/chirimen-raspi-docker/issues/257) / [runtime-verification.md](../examples/runtime-verification.md)） |
| [Example Catalog と Legacy 資産](../examples/catalog.md) | 出典・責務・status・Catalog 技術構成（[#258](https://github.com/gurezo/chirimen-raspi-docker/issues/258)） |
| [browser-editor.md](./browser-editor.md) | Phase 8 Browser Editor 選定（code-server、arm64。image は #174。Compose は #175。既定起動は #208。初期設定は #178。Example 編集は #179。Extension は #201。利用ガイドは #183） |
| [nx-boundaries.md](./nx-boundaries.md) | Nx tags と module boundaries |
| [unit-test.md](./unit-test.md) | Vitest / Nx unit test 方針 |
| [Raspberry Pi Setup](../guides/raspberry-pi-setup.md) | Host 構築（`setups/`） |
| [Getting Started](../guides/getting-started.md) | setup.sh → docker compose up -d → Catalog :4200 → First Example |
| [Browser Development Environment](../guides/browser-development.md) | Learn → Edit → Save → Run → Verify の正本（#242）。実機 E2E は [#243](https://github.com/gurezo/chirimen-raspi-docker/issues/243) |
| [GPIO LED Blink](../guides/gpio-led-blink.md) | 必要部品・配線・HTML サンプルでの点滅手順 |
| [GPIO LED Blink 回路仕様](../examples/gpio-led-blink.md) | BCM 26 / 物理 pin 37 / LED + 330Ω |
| [GPIO Input](../guides/gpio-input.md) | 必要部品・配線・HTML サンプルでの入力確認手順 |
| [GPIO Input 回路仕様](../examples/gpio-input.md) | BCM 5 / 物理 pin 29 / タクトスイッチ + 10kΩ プルアップ |
| [I2C Scan](../guides/i2c-scan.md) | I2C 有効化・配線・HTML サンプルでの address scan 手順 |
| [I2C Scan 検証仕様](../examples/i2c-scan.md) | ADT7410 / `0x48` / I2C1（物理 pin 3 / 5）。[#116](https://github.com/gurezo/chirimen-raspi-docker/issues/116) |
| [Troubleshooting](../guides/troubleshooting.md) | よくある障害 |

公開 TypeScript API のリファレンスは [API docs](https://gurezo.github.io/chirimen-raspi-docker/api/)（ローカル生成は `pnpm docs:api`、出力先 `docs/api/`、git 管理外）。
Documentation ポータル: https://gurezo.github.io/chirimen-raspi-docker/
