# Development

リポジトリをホスト上で開発するための Node.js / pnpm / Nx セットアップ。

Runtime 利用（`./scripts/start.sh`）には host の Node.js は不要です。Raspberry Pi 上で CHIRIMEN Runtime だけを動かす場合は [Getting Started](./getting-started.md) の3段階を参照してください。Host 構築の詳細は [Raspberry Pi Setup](./raspberry-pi-setup.md)。

関連:

- [Raspberry Pi Setup](./raspberry-pi-setup.md)（Host 構築）
- [Getting Started](./getting-started.md)（3段階。Runtime 起動は Step 2）
- [Browser Development Environment](./browser-development.md)（Browser Editor から Example を編集する）
- [Architecture overview](../architecture/overview.md)
- [Nx boundaries](../architecture/nx-boundaries.md)

## 対象

このガイドはリポジトリ開発者向けです。

```text
Raspberry Pi Setup / CHIRIMEN Setup（Runtime 利用）
    ↓
Docker / Docker Compose

Development setup
    ↓
Node.js / pnpm / Nx
```

## 必要環境

- Node.js 24（64-bit。Docker image と同じ系統）
- pnpm v11.x（root `package.json` の `packageManager`）
- Nx
- Docker / Docker Compose（Runtime 起動や image build をする場合）
- Raspberry Pi 上で Runtime を動かす場合のサポート対象は Raspberry Pi OS 64-bit。Recommended: Raspberry Pi OS Lite 64-bit

> 32-bit OS は非推奨です。[詳細を見る](../architecture/compatibility-32bit.md)

## Node.js のインストール

host への `apt install nodejs npm` は使いません。version manager（nvm）で Node.js 24 を入れてください。

### nvm

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
source ~/.bashrc
nvm install 24
nvm use 24
nvm alias default 24
```

macOS など 64-bit 開発マシンも Node 24 を使います。CI も Node 24 です。

## リポジトリの開発コマンド

```sh
pnpm install
npx nx show projects
npx nx build server
npx nx serve server
pnpm nx serve example-catalog
npx nx graph
```

`pnpm nx serve example-catalog` は Example Catalog（`apps/example-catalog`）を host で開発する手順です。開発マシン上の Browser から Vite の `http://localhost:4200/` が開きます。Compose 既定の Catalog URL は `http://127.0.0.1:4200/`（Raspberry Pi 上、または SSH port forward 先）です。Compose の `chirimen-example-catalog` も同じ port `4200` を使うため、同時には使いません。Browser Editor から Example を編集する手順ではありません。Example の確認先は `http://127.0.0.1:4173/` です（[Browser Development Environment](./browser-development.md)）。

Compose の Catalog と host Vite を同時に使わないときは、先に止めます。

```sh
docker compose stop chirimen-example-catalog
pnpm nx serve example-catalog
```

Runtime / Browser Polyfill / GPIO / I2C の確認は [Runtime Diagnostics](./runtime-diagnostics.md) です。`navigator.requestGPIOAccess` / `requestI2CAccess` を使うには、先に Runtime（`./scripts/start.sh` または `npx nx serve server`）を起動してください。操作手順は [Getting Started の Step 2](./getting-started.md#step-2-chirimen-setup) と [browser-polyfill.md](./browser-polyfill.md) を参照してください。
