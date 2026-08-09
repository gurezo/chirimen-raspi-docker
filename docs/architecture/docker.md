# Docker 構成

Raspberry Pi 上で CHIRIMEN Runtime（`apps/server`）を Docker / Compose で起動する方針を記録する。

関連:

- 親 Issue: [#6 Phase 6: CI, Documentation and Release](https://github.com/gurezo/chirimen-raspi-docker/issues/6)
- 子 Issue: [#45 Architecture / Guide docs を整備する](https://github.com/gurezo/chirimen-raspi-docker/issues/45)
- [overview.md](./overview.md)
- [Getting Started](../guides/getting-started.md)

## 方針

- カスタム Raspberry Pi イメージは作成しない
- Docker は配布・実行手段であり、中心の責務は Runtime / Protocol / Polyfill
- ユーザーの入口は root の [`compose.yaml`](../../compose.yaml)

```sh
docker compose up --build
```

## Compose サービス

現行のサービスは `chirimen-server` のみ。

| 項目 | 値 |
| --- | --- |
| Service | `chirimen-server` |
| Dockerfile | [`docker/server/Dockerfile`](../../docker/server/Dockerfile) |
| Image | `chirimen-raspi-docker/server:phase1` |
| Port | `33330`（host / container） |
| ENV | `HOST=0.0.0.0`, `PORT=33330` |

### 起動と health check

```sh
docker compose up --build
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
