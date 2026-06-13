# chirimen-raspi-docker
Raspberry Pi 3 / 4 / 5 向け CHIRIMEN Docker Runtime

## Phase 1: Nx workspace / server / Docker 最小構成

このリポジトリは、Raspberry Pi 3 / 4 / 5 向け CHIRIMEN Runtime を Docker / TypeScript / Nx Workspace ベースで再構築するための Monorepo です。

Phase 1 では、以下の最小構成を提供します。

- `apps/server`: Express ベースの最小 server
- `libs/core`: 共通 runtime health 型
- `libs/gpio`: GPIO domain の最小型
- `libs/node-runtime`: Node.js Runtime context の最小実装
- `docker/server/Dockerfile`: server 用 Docker image
- `compose.yaml`: server 起動用 Docker Compose 設定

現時点では GPIO / I2C の実ハードウェア操作は未実装です。Docker Compose で server を起動し、health endpoint の応答を確認できる状態を Phase 1 の対象にしています。

## 必要環境

- Node.js
- pnpm v11.x
- Docker
- Docker Compose

## ローカル開発

```sh
pnpm install
npx nx show projects
npx nx build server
```

Nx graph は以下で確認できます。

```sh
npx nx graph
```

## Docker で起動

```sh
docker compose up --build
```

server は default で `33330` 番 port を使用します。

```sh
curl http://localhost:33330/health
```

期待する応答例:

```json
{
  "name": "chirimen-raspi-docker-server",
  "status": "ok",
  "version": "0.0.1"
}
```
