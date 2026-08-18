# Development

リポジトリをホスト上で開発するための Node.js / pnpm / Nx セットアップ。

Runtime 利用（`./scripts/start.sh`）には host の Node.js は不要です。Raspberry Pi 上で CHIRIMEN Runtime だけを動かす場合は [Getting Started](./getting-started.md) と [Raspberry Pi setup](./raspberry-pi-setup.md) を参照してください。

関連:

- [Getting Started](./getting-started.md)
- [Raspberry Pi setup](./raspberry-pi-setup.md)
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
- 32-bit OS はサポート対象外

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

`pnpm nx serve web-demo` は `http://localhost:4200/` で Browser demo を起動します（Vite HMR）。Compose の `chirimen-web-demo`（`./scripts/start.sh --editor`）も同じ port を使うため、同時には使いません。`navigator.requestGPIOAccess` / `requestI2CAccess` を使うには、先に Runtime（`./scripts/start.sh` または `npx nx serve server`）を起動してください。

操作手順は [Getting Started](./getting-started.md) と [browser-polyfill.md](./browser-polyfill.md) を参照してください。
