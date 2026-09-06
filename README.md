# chirimen-raspi-docker

Raspberry Pi 3 B+ / 4 / 5 で、ブラウザから GPIO / I2C を操作するための Docker ベース CHIRIMEN Runtime です。

## Supported Hardware / Recommended OS

- Raspberry Pi 3 B+
- Raspberry Pi 4
- Raspberry Pi 5

Recommended: Raspberry Pi OS Lite 64-bit

> 32-bit OS は非推奨です。詳細は [Compatibility](docs/architecture/compatibility.md) を参照してください。

## Quick Start

初めて使う場合は、先に [Raspberry Pi Setup](docs/guides/raspberry-pi-setup.md) を完了してください。

```text
Raspberry Pi Setup
        ↓
./scripts/doctor.sh
        ↓
./scripts/start.sh
        ↓
curl http://localhost:33330/health
```

準備済みなら:

```sh
./scripts/doctor.sh
./scripts/start.sh
curl http://localhost:33330/health
```

手順の説明は [Getting Started](docs/guides/getting-started.md) を参照してください。

## Documentation

公開 Documentation: https://gurezo.github.io/chirimen-raspi-docker/

| 目的 | Documentation |
| --- | --- |
| 初めて使う | [Raspberry Pi Setup](docs/guides/raspberry-pi-setup.md) |
| Runtime を起動する | [Getting Started](docs/guides/getting-started.md) |
| GPIO / I2C を試す | [Examples](https://gurezo.github.io/chirimen-raspi-docker/#use) / [GPIO LED Blink](docs/guides/gpio-led-blink.md) |
| 問題を調べる | [Troubleshooting](docs/guides/troubleshooting.md) |
| 対応環境を確認する | [Compatibility](docs/architecture/compatibility.md) |
| 内部設計を調べる | [Architecture](docs/architecture/overview.md) |
| API を調べる | [API Reference](https://gurezo.github.io/chirimen-raspi-docker/api/) |

## Runtime 必要環境

- Raspberry Pi 3 B+ / 4 / 5
- Raspbian OS 64-bit
- Docker
- Docker Compose

32-bit OS はサポート対象外です。

Node.js / npm / pnpm はホスト OS には不要です。Runtime は Docker コンテナ内の Node.js を使います。

## Development 必要環境

リポジトリ自体をホスト上で開発する場合（手順は [Development Guide](docs/guides/development.md)）:

- Node.js 24（64-bit）
- pnpm v11.x
- Nx
- Docker
- Docker Compose

依存は root の `package.json` に集約した統合型 Nx モノレポ構成です。`apps/*` / `libs/*` に個別の `package.json` はありません。project 間の import（例: `from 'node-runtime'`）は `tsconfig.base.json` の `paths` で解決します。

## ローカル開発

```sh
pnpm install
npx nx show projects
npx nx build server
pnpm nx serve web-demo
npx nx graph
```

`pnpm nx serve web-demo` は `http://localhost:4200/` で Browser demo を起動します（Vite HMR。Compose の web-demo と port が衝突します）。`navigator.requestGPIOAccess` / `requestI2CAccess` を使うには、先に Runtime（`./scripts/start.sh` または `npx nx serve server`）を起動してください。Browser だけの経路は `./scripts/start.sh` のあと `http://127.0.0.1:4200/` です。操作手順は [Getting Started](docs/guides/getting-started.md) と [browser-polyfill.md](docs/guides/browser-polyfill.md) を参照してください。
