# Development

リポジトリをホスト上で開発するための Node.js / pnpm / Nx セットアップ。

Runtime 利用（`./scripts/start.sh`）には host の Node.js は不要です。Raspberry Pi 上で CHIRIMEN Runtime だけを動かす場合は [Raspberry Pi Setup](./raspberry-pi-setup.md) と [Getting Started](./getting-started.md) を参照してください。

関連:

- [Raspberry Pi Setup](./raspberry-pi-setup.md)
- [Getting Started](./getting-started.md)
- [Browser Development Environment](./browser-development.md)（Browser Editor から Example を編集する。Web Demo 自体の開発ではない）
- [Architecture overview](../architecture/overview.md)
- [Nx boundaries](../architecture/nx-boundaries.md)

## 対象

このガイドはリポジトリ開発者向けです。

```text
Runtime setup
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
- Raspberry Pi 上で Runtime を動かす場合は Raspberry Pi OS 64-bit。Recommended: Raspberry Pi OS Lite 64-bit

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
pnpm nx serve web-demo
npx nx graph
```

`pnpm nx serve web-demo` は Web Demo 自体（`apps/web-demo`）を host で開発する手順です。Vite HMR で `http://localhost:4200/` が開きます。Browser Editor から Example を編集する手順ではありません。Example の確認先は `http://127.0.0.1:4173/` です（[Browser Development Environment](./browser-development.md)）。

Web Demo は Runtime Demo / Diagnostic UI です。次の疎通確認に使います。

```text
Runtime が起動しているか
↓
Browser Polyfill が接続できるか
↓
WebSocket が接続できるか
↓
GPIO / I2C API が動作するか
```

Compose の `chirimen-web-demo`（`./scripts/start.sh`）も同じ port `4200` を使うため、同時には使いません。host で serve するときは先に止めます。

```sh
docker compose stop chirimen-web-demo
pnpm nx serve web-demo
```

`navigator.requestGPIOAccess` / `requestI2CAccess` を使うには、先に Runtime（`./scripts/start.sh` または `npx nx serve server`）を起動してください。操作手順は [Getting Started](./getting-started.md) と [browser-polyfill.md](./browser-polyfill.md) を参照してください。
