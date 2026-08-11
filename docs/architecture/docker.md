# Docker 構成

Raspberry Pi 上で CHIRIMEN Runtime（`apps/server`）を Docker / Compose で起動する方針を記録する。

関連:

- 親 Issue: [#6 Phase 6: CI, Documentation and Release](https://github.com/gurezo/chirimen-raspi-docker/issues/6)
- 子 Issue: [#45 Architecture / Guide docs を整備する](https://github.com/gurezo/chirimen-raspi-docker/issues/45)
- 子 Issue: [#122 Docker 起動時の GPIO device mapping を capability-aware にする](https://github.com/gurezo/chirimen-raspi-docker/issues/122)
- [overview.md](./overview.md)
- [Getting Started](../guides/getting-started.md)

## 方針

- カスタム Raspberry Pi イメージは作成しない
- Docker は配布・実行手段であり、中心の責務は Runtime / Protocol / Polyfill
- 推奨入口は [`scripts/start.sh`](../../scripts/start.sh)（capability-aware device mapping）
- ベース定義は root の [`compose.yaml`](../../compose.yaml)

```sh
chmod +x scripts/start.sh
./scripts/start.sh
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
./scripts/start.sh
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
| `deps` | native addon 用に `python3` / `make` / `g++` を入れ、lockfile から依存を install |
| `build` | `pnpm nx build server` |
| `runtime` | ビルド成果を含む workspace を起動。`node apps/server/dist/main.js`（build tools は含めない） |

`deps` の build tools は `i2c-bus`（`node-web-i2c` 経由）などが `node-gyp` で native rebuild するために必要。`runtime` は `base` から作るため、最終 image にコンパイラは残らない。

本番 image も現状は workspace 一式をコピーする構成である（将来の slim 化は別 Issue）。

## Device / volume mount（privileged なし・capability-aware）

`privileged: true` は使わない。

| 種別 | Host → Container | いつ渡すか | 用途 |
| --- | --- | --- | --- |
| `volumes` | `/sys/class/gpio` | 常時（`compose.yaml`） | `node-web-gpio` / sysfs（export / unexport） |
| `volumes` | `/sys/devices` | 常時（`compose.yaml`） | gpioN symlink 先（direction / value）。`/sys/class/gpio` だけでは EROFS になる |
| `devices` | `/dev/gpiomem*` | host に存在するときのみ（`start.sh`） | 任意。Runtime の必須条件ではない |
| `devices` | `/dev/gpiochip*` | host に存在するときのみ（`start.sh`） | 将来 gpiochip backend 用。現状 unsupported |
| `devices` | `/dev/i2c-1` | host に存在するときのみ（`start.sh`） | primary I2C bus（`node-web-i2c`） |

`scripts/start.sh` は doctor / Runtime と同じパス基準で host を探査し、存在する device だけを一時 Compose override に書いて `docker compose -f compose.yaml -f <override> up` する。欠如 device はスキップして起動を続ける（Runtime が capability を `unavailable` 等で報告する）。

現在の server image は root で起動するため、当面 `group_add`（`gpio` / `i2c` グループ）は必須ではない。

container 内の確認例:

```sh
docker compose exec chirimen-server ls -l /sys/class/gpio
docker compose exec chirimen-server ls -l /dev/gpiomem* /dev/gpiochip* /dev/i2c-1 2>/dev/null || true
```

## Raspberry Pi 3 / 4 と 5

- **同一手順**: Pi 3 / 4 / 5 とも `./scripts/start.sh`。モデルごとの `compose.yaml` 手編集は不要
- **`gpiomem`**: Pi 3 / 4 では一般的。Pi 5 では無いことがある（任意）
- **`gpiochip*`**: 存在すれば渡る。backend 未実装のため、sysfs が無い場合は GPIO unavailable
- **I2C**: primary bus は `/dev/i2c-1` 想定。存在するときだけ渡す

host 側の有効化・診断は [raspberry-pi-setup.md](../guides/raspberry-pi-setup.md) と `scripts/doctor.sh` / `scripts/enable-i2c.sh` を参照。

## 非 Pi 環境での制限

任意 device が無くても `./scripts/start.sh` は起動を試みる（GPIO / I2C は unavailable）。`/sys/class/gpio` が host に無い場合は volume bind の挙動が環境依存のため、GPIO 検証は Raspberry Pi 上で行う。

代替:

- `pnpm install` のうえ `npx nx build server` / `npx nx serve server` で TypeScript / server 開発を続ける

障害の切り分けは [troubleshooting.md](../guides/troubleshooting.md) を参照。

## 未実装（将来）

Wiki で想定している次は、現状未実装。

| 要素 | 予定役割 |
| --- | --- |
| `docker/nginx` | reverse proxy / static hosting |
| `apps/web-demo`（compose 連携） | Browser Polyfill の example |

初期実装では `chirimen-server` を優先する。
