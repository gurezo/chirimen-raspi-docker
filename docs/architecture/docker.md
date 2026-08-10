# Docker 構成

Raspberry Pi 上で CHIRIMEN Runtime（`apps/server`）を Docker / Compose で起動する方針を記録する。

関連:

- 親 Issue: [#6 Phase 6: CI, Documentation and Release](https://github.com/gurezo/chirimen-raspi-docker/issues/6)
- 子 Issue: [#47 Docker image release を実装する](https://github.com/gurezo/chirimen-raspi-docker/issues/47)
- 子 Issue: [#45 Architecture / Guide docs を整備する](https://github.com/gurezo/chirimen-raspi-docker/issues/45)
- [overview.md](./overview.md)
- [Getting Started](../guides/getting-started.md)

## 方針

- カスタム Raspberry Pi イメージは作成しない
- Docker は配布・実行手段であり、中心の責務は Runtime / Protocol / Polyfill
- ユーザーの入口は root の [`compose.yaml`](../../compose.yaml)
- 公開 image は GHCR から pull して起動する（開発時はローカル build も可）

```sh
# 公開 image を利用（推奨）
docker compose up

# ローカルで Dockerfile から再構築する場合
docker compose up --build
```

## GHCR 公開 image

| 項目 | 値 |
| --- | --- |
| Registry | GitHub Container Registry（`ghcr.io`） |
| Image | `ghcr.io/gurezo/chirimen-raspi-docker/server` |
| 成果物 arch | `linux/arm64`（64-bit Raspberry Pi OS 向け） |
| ビルド環境 | Raspberry Pi OS 上の **self-hosted runner**（ネイティブビルド） |
| Workflow | [`.github/workflows/docker-release.yml`](../../.github/workflows/docker-release.yml) |

以前のローカル向け image 名 `chirimen-raspi-docker/server:phase1` は、GHCR 公開名へ移行した。Compose の `image` は GHCR を参照する。

### ビルド方針

- リリース用 image は **Raspberry Pi OS（64-bit）上でネイティブビルド**する
- GitHub-hosted `ubuntu-latest` + QEMU によるクロスビルドは使わない
- workflow は `runs-on: [self-hosted, linux, ARM64]` を要求する。対象 Pi に [self-hosted runner](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/adding-self-hosted-runners) を登録し、Docker が利用できる状態にしておく
- runner が offline のあいだジョブは待ちになる

### アーキテクチャ対応範囲

- **対応**: Raspberry Pi 3 / 4 / 5 上の **64-bit Raspberry Pi OS**（`linux/arm64`）
- **非対応（本リリース）**: 32-bit OS（`linux/arm/v7`）。32-bit では GHCR image を pull / 起動できない

host の arch 確認例:

```sh
uname -m
# aarch64 であること（armv7l の場合は 64-bit OS が必要）
```

### Tag / version 方針

git tag `vX.Y.Z` の push（または `workflow_dispatch`）で image を公開する。

| Tag | 意味 |
| --- | --- |
| `X.Y.Z` | semver（例: `v1.2.3` → `1.2.3`） |
| `X.Y` | minor 系列の最新（例: `1.2`） |
| `latest` | 直近の semver リリース |
| `sha-<short>` | ビルドした commit の短縮 SHA |

リリース手順:

```sh
git tag vX.Y.Z
git push origin vX.Y.Z
```

pull 例:

```sh
docker pull ghcr.io/gurezo/chirimen-raspi-docker/server:latest
```

## Compose サービス

現行のサービスは `chirimen-server` のみ。

| 項目 | 値 |
| --- | --- |
| Service | `chirimen-server` |
| Dockerfile | [`docker/server/Dockerfile`](../../docker/server/Dockerfile) |
| Image | `ghcr.io/gurezo/chirimen-raspi-docker/server:latest` |
| Port | `33330`（host / container） |
| ENV | `HOST=0.0.0.0`, `PORT=33330` |

### 起動と health check

```sh
docker compose up
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

## Dockerfile（multi-stage）

[`docker/server/Dockerfile`](../../docker/server/Dockerfile) は次の stage 構成。

| Stage | 役割 |
| --- | --- |
| `base` | `node:24-bookworm-slim`、corepack で pnpm を有効化 |
| `deps` | lockfile から依存を install |
| `build` | `pnpm nx build server` |
| `runtime` | ビルド成果を含む workspace を起動。`node apps/server/dist/main.js` |

本番 image も現状は workspace 一式をコピーする構成である（将来の slim 化は別 Issue）。

## Device / volume mount（privileged なし）

`privileged: true` は使わない。GPIO / I2C に必要なものだけを通す。

| 種別 | Host → Container | 用途 |
| --- | --- | --- |
| `devices` | `/dev/gpiomem` | host GPIO アクセス |
| `devices` | `/dev/i2c-1` | primary I2C bus（`node-web-i2c`） |
| `volumes` | `/sys/class/gpio` | `node-web-gpio` が sysfs 経由で操作 |

現在の server image は root で起動するため、当面 `group_add`（`gpio` / `i2c` グループ）は必須ではない。

container 内の確認例:

```sh
docker compose exec chirimen-server ls -l /dev/gpiomem /dev/i2c-1 /sys/class/gpio
```

## Raspberry Pi 3 / 4 と 5

公開 image は `linux/arm64` のみのため、いずれも **64-bit Raspberry Pi OS** を前提とする。

- **Pi 3 / 4**: `/dev/gpiomem` が一般的。現行 `compose.yaml` で足りる想定
- **Pi 5**: `/dev/gpiomem` が無い、または `/dev/gpiochip*`（例: `gpiochip0`）が主になる場合がある。不足時は host で `ls -l /dev/gpiomem* /dev/gpiochip*` を確認し、必要な device を `devices` に追加する。存在しない device を並べると Pi 3 / 4 で起動に失敗するため、共通の `compose.yaml` には入れていない
- **I2C**: Pi 3 / 4 / 5 とも primary bus は `/dev/i2c-1` 想定。別名 bus が必要な場合は host で確認してから追加する

host 側の有効化・診断は [raspberry-pi-setup.md](../guides/raspberry-pi-setup.md) と `scripts/doctor.sh` / `scripts/enable-i2c.sh` を参照。

## 非 Pi 環境での制限

`/dev/gpiomem` や `/dev/i2c-1` が無い環境（macOS など）では、`docker compose up` が device 欠如で失敗する。

代替:

- `compose.yaml` の `devices` / `volumes` を一時的に外す（GPIO / I2C 検証は不可）
- `pnpm install` のうえ `npx nx build server` / `npx nx serve server` で TypeScript / server 開発を続ける

障害の切り分けは [troubleshooting.md](../guides/troubleshooting.md) を参照。

## 未実装（将来）

Wiki で想定している次は、現状未実装。

| 要素 | 予定役割 |
| --- | --- |
| `docker/nginx` | reverse proxy / static hosting |
| `apps/web-demo`（compose 連携） | Browser Polyfill の example |

初期実装では `chirimen-server` を優先する。
