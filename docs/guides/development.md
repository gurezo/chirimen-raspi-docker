# Development

リポジトリをホスト上で開発するための Node.js / pnpm / Nx セットアップ。

Runtime 利用（`docker compose up -d`）には host の Node.js は不要です。Raspberry Pi 上で CHIRIMEN Runtime だけを動かす場合は [Getting Started](./getting-started.md) を参照してください。Host 構築の詳細は [Raspberry Pi Setup](./raspberry-pi-setup.md)。

関連:

- 親 Issue: [#304 Raspberry Pi 3 B+ を Runtime-only とし Docker build を Pi 4 / Pi 5 に限定する](https://github.com/gurezo/chirimen-raspi-docker/issues/304)
- 子 Issue: [#307 Development Documentation に Docker build は Raspberry Pi 4 / Pi 5 対象と明記する](https://github.com/gurezo/chirimen-raspi-docker/issues/307)
- 子 Issue: [#309 Documentation 全体の Raspberry Pi 3 B+ Docker build 記述を棚卸しする](https://github.com/gurezo/chirimen-raspi-docker/issues/309)
- 実機検証: [#283](https://github.com/gurezo/chirimen-raspi-docker/issues/283) / [Pi 3 B+ の build 非推奨コメント](https://github.com/gurezo/chirimen-raspi-docker/issues/283#issuecomment-5762812796)
- [Compatibility](../architecture/compatibility.md)（[Runtime Support](../architecture/compatibility.md#runtime-support) / [Development / Docker Build Support](../architecture/compatibility.md#development--docker-build-support)）
- [Raspberry Pi Setup](./raspberry-pi-setup.md)（Host 構築）
- [Getting Started](./getting-started.md)（Runtime 利用。起動は Step 2: `docker compose up -d`）
- [Browser Development Environment](./browser-development.md)（Browser Editor から Example を編集する）
- [Documentation checklist](./documentation-checklist.md)（Service / Port / Workspace / `apps/` 変更時）
- [Architecture overview](../architecture/overview.md)
- [Docker 構成](../architecture/docker.md)
- [Nx boundaries](../architecture/nx-boundaries.md)

## 対象

このガイドはリポジトリ開発者向けです。次を区別する。

| 目的 | 案内先 | 機種 |
| --- | --- | --- |
| Runtime 利用（compose `up` / `down`） | [Getting Started](./getting-started.md) / `./setups/setup.sh` | Pi 3 B+ / Pi 4 / Pi 5（Pi 3 B+ は **Runtime-only**） |
| Repository 開発（host の Node.js / pnpm / Nx） | 本ガイド | 開発マシン（macOS など）および Pi |
| on-device Docker image build | 本ガイドの build 節 / [Compatibility](../architecture/compatibility.md#development--docker-build-support) | **Raspberry Pi 4 / Pi 5 のみ**（Pi 3 B+ は Unsupported） |

```text
Beginner / Runtime
    ↓
./setups/setup.sh → docker compose up / down（Pi 3 B+ 含む。build なし）

Development setup（Repository 開発）
    ↓
Node.js / pnpm / Nx

Docker image build（on-device）+ swap.sh
    ↓
Raspberry Pi 4 / Pi 5 のみ（Development-only）
```

正本のロール表は [Compatibility](../architecture/compatibility.md) である。`swap.sh` と Docker build は beginner / `setup.sh` からは呼ばない。

## 必要環境

- Node.js 24（64-bit。Docker image と同じ系統）
- pnpm v11.x（root `package.json` の `packageManager`）
- Nx
- Docker / Docker Compose（Runtime 起動や image build をする場合）
  - **Docker build**（`docker build` / `compose build` / `up --build`）は **Raspberry Pi 4 / Pi 5** を対象とする
  - **Raspberry Pi 3 B+** は **Runtime-only**（compose `up` / `down`）。on-device の Docker build は Unsupported
- Raspberry Pi 上で Runtime を動かす場合のサポート対象は Raspberry Pi OS 64-bit。標準環境: Raspberry Pi OS 64-bit Desktop（Lite も可）

> 32-bit OS は Unsupported です。[Historical: 32-bit Compatibility](../architecture/compatibility-32bit.md)

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
npx nx build runtime
npx nx serve runtime
pnpm nx serve catalog
npx nx graph
```

`pnpm nx serve catalog` は Example Catalog（`apps/catalog`）を host で開発する手順です。開発マシン上の Browser から Vite の `http://localhost:4200/` が開きます。Compose 既定の Catalog URL は `http://127.0.0.1:4200/`（Raspberry Pi 上、または SSH port forward 先）です。Compose の `chirimen-example-catalog` も同じ port `4200` を使うため、同時には使いません。Browser Editor から Example を編集する手順ではありません。Example の確認先は `http://127.0.0.1:4173/` です（[Browser Development Environment](./browser-development.md)）。

Compose の Catalog と host Vite を同時に使わないときは、先に止めます。

```sh
docker compose stop chirimen-example-catalog
pnpm nx serve catalog
```

Runtime / Browser Polyfill / GPIO / I2C の確認は [Runtime Diagnostics](./runtime-diagnostics.md) です。`navigator.requestGPIOAccess` / `requestI2CAccess` を使うには、先に Runtime（`docker compose up -d`、または Development 向けの `./scripts/start.sh` / `npx nx serve runtime`）を起動してください。操作手順は [Getting Started の Step 2](./getting-started.md#step-2-start-runtime) と [browser-polyfill.md](./browser-polyfill.md) を参照してください。

## Docker image build（Raspberry Pi 4 / Pi 5）

on-device の Docker image build は **Raspberry Pi 4 / Pi 5** を対象とする。Pi 3 B+ は **Runtime-only** であり、次のコマンドは Unsupported である。正本は [Compatibility の Development / Docker Build Support](../architecture/compatibility.md#development--docker-build-support)。根拠は [#283](https://github.com/gurezo/chirimen-raspi-docker/issues/283) および [検証コメント](https://github.com/gurezo/chirimen-raspi-docker/issues/283#issuecomment-5762812796)。

Beginner / Runtime 導線（`./setups/setup.sh` → `docker compose up -d`）とは別である。build 前に Host の Swap を確保する場合は **Development-only** の `swap.sh` を使う（`setup.sh` は呼ばない）。

### swap.sh（Development-only・OOM 緩和）

Pi 4 / Pi 5 で Docker build や高負荷開発中の OOM を緩和するため、任意だが推奨する。詳細は [Raspberry Pi Setup の swap.sh](./raspberry-pi-setup.md#development-only-swapsh)。

```sh
df -h /
sudo ./setups/swap.sh
sudo ./setups/swap.sh --check
```

対象コマンドの例:

```text
docker build
docker compose build
docker compose up --build
./scripts/start.sh（引数なし。既定で --build）
```

### Raspberry Pi 4 / Pi 5（Build Supported）

```sh
./scripts/start.sh            # 既定で --build
./scripts/start.sh --lan
docker compose build
docker compose up --build
```

個別 image の `docker build` / `docker buildx` は [Docker 構成](../architecture/docker.md) を参照する。

### Raspberry Pi 3 B+（Runtime-only）

Pi 3 B+ では on-device の Docker build を案内しない。Runtime 利用は、image を用意したうえで `docker compose up -d --no-build`（または上級者向け `./scripts/start.sh --no-build`）。手順の正本は [Getting Started の Step 2（Docker image 前提）](./getting-started.md#docker-image前提)。

**現状**: GHCR 等の prebuilt 配布は無い。暫定は Pi 4 / Pi 5（または arm64 build 可能なマシン）で image を作り、`docker save` / `docker load` で運ぶ。初学者向けに確実な第一導線は **Pi 4 / Pi 5**（初回 `up -d` での Compose build が Supported）である。

## Documentation の整合性

`compose.yaml` の Service 名、Port、`apps/`、`workspace/`、Browser Development Flow を変えたときは [Documentation checklist](./documentation-checklist.md) で README / Getting Started / Browser Development の更新漏れを確認してください。
