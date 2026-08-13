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
- Dockerfile は OS の bit 数で分ける（32-bit は Node 22、64-bit は Node 24）

```sh
chmod +x scripts/start.sh
./scripts/start.sh          # uname -m で自動選択
./scripts/start.sh --32bit  # 32-bit OS
./scripts/start.sh --64bit  # 64-bit OS
```

## Compose サービス

現行のサービスは `chirimen-server` のみ。

| 項目 | 値 |
| --- | --- |
| Service | `chirimen-server` |
| Dockerfile | 64-bit: [`docker/server/Dockerfile`](../../docker/server/Dockerfile)（Node 24）。32-bit: [`docker/server/Dockerfile.32bit`](../../docker/server/Dockerfile.32bit)（Node 22）。`start.sh` が選択 |
| Image | 64-bit: `chirimen-raspi-docker/server:phase1`。32-bit: `chirimen-raspi-docker/server:phase1-32bit` |
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

stage 構成は 32-bit / 64-bit でほぼ共通。`FROM` と 32-bit の build コマンドだけが異なる。

| OS | ファイル | ベース | 理由 |
| --- | --- | --- | --- |
| 32-bit（`armv7l` など） | [`docker/server/Dockerfile.32bit`](../../docker/server/Dockerfile.32bit) | `node:22-bookworm-slim` | Node 24 公式 image に `linux/arm/v7` が無い |
| 64-bit（`aarch64` / `x86_64` など） | [`docker/server/Dockerfile`](../../docker/server/Dockerfile) | `node:24-bookworm-slim` | 現行の推奨。`compose.yaml` の default |

`./scripts/start.sh` は `uname -m` で自動選択する。明示する場合は `--32bit` / `--64bit`（または `--arch 32` / `--arch 64`）。`docker compose up --build` を直接使うと 64-bit 用 `Dockerfile` になる。

| Stage | 役割 |
| --- | --- |
| `base` | 上記の Node slim image、corepack で pnpm を有効化 |
| `deps` | native addon 用に `python3` / `make` / `g++` を入れ、lockfile から依存を install |
| `build` | 64-bit: `pnpm nx build server`。32-bit: `node scripts/build-server.mjs`（Nx native hasher が armv7 で失敗するため esbuild で同等の bundle をする） |
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

`scripts/start.sh` は doctor / Runtime と同じパス基準で host を探査し、存在する device だけを一時 Compose override に書いて `docker compose -f compose.yaml -f <override> up` する。同じ override で Dockerfile / image tag も OS bit 数に合わせて上書きする。欠如 device はスキップして起動を続ける（Runtime が capability を `unavailable` 等で報告する）。

現在の server image は root で起動するため、当面 `group_add`（`gpio` / `i2c` グループ）は必須ではない。

container 内の確認例:

```sh
docker compose exec chirimen-server ls -l /sys/class/gpio
docker compose exec chirimen-server ls -l /dev/gpiomem* /dev/gpiochip* /dev/i2c-1 2>/dev/null || true
```

## Compatibility matrix

Raspberry Pi 3 / 4 / 5 の対応状態は、モデル名だけではなく Hardware Capability Detection と Runtime Backend の実機検証結果として記録する。検証済み行の OS は **Raspbian OS 64-bit** である。未検証項目は `Supported` と書かない。

| Model | OS | Kernel | Arch | GPIO Capability | GPIO Backend | I2C Backend | Browser E2E | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Raspberry Pi 3 B+ | Raspbian OS 64-bit | `6.18.34+rpt-rpi-v8` | `aarch64` | sysfs（`/sys/class/gpio`） | sysfs | i2c-dev | WebSocket `gpio.export` 成功 | Verified |
| Raspberry Pi 3 A+ | TBD | TBD | TBD | TBD | TBD | TBD | TBD | Not verified |
| Raspberry Pi 4 | Raspbian OS 64-bit | `6.18.34+rpt-rpi-v8` | `aarch64` | sysfs（`/sys/class/gpio`） | sysfs | i2c-dev | WebSocket `gpio.export` 成功 | Verified |
| Raspberry Pi 5 Model B Rev 1.0 | Raspbian OS 64-bit | `6.18.34+rpt-rpi-2712` | `aarch64` | sysfs（`/sys/class/gpio`） | sysfs | i2c-dev | WebSocket `gpio.export` / `write` / `unexport` 成功 | Verified |

- **Browser E2E**: 実ブラウザ + polyfill UI ではなく、container 内 WebSocket クライアントによる protocol E2E。`Supported` とは書かない
- **I2C**: 初期状態で `/dev/i2c-1` が無い場合あり。有効化後に `i2c-dev`
- **Raspbian OS 32-bit**（`armv7l` / `6.18.34+rpt-rpi-v7`）: host path 確認のみ。Runtime E2E は未検証のため `Supported` と書かない。検証は [#135](https://github.com/gurezo/chirimen-raspi-docker/issues/135)
- 詳細は下記の Pi 3 B+（#97） / Pi 4（#98） / Pi 5（#99）実機検証

## Raspberry Pi 3 / 4 と 5

- **同一手順**: Pi 3 / 4 / 5 とも `./scripts/start.sh`。モデルごとの `compose.yaml` 手編集は不要
- **`gpiomem`**: Pi 3 / 4 では一般的。Pi 5 では無いことがある（任意）
- **`gpiochip*`**: 存在すれば渡る。backend 未実装のため、sysfs が無い場合は GPIO unavailable
- **I2C**: primary bus は `/dev/i2c-1` 想定。存在するときだけ渡す

### Pi 3 B+ 実機検証（#97）

Raspberry Pi 3 Model B+（Raspbian OS 64-bit / `aarch64` / kernel `6.18.34+rpt-rpi-v8`）で次を確認済み。

| 項目 | 結果 |
| --- | --- |
| host paths | `/sys/class/gpio`・`/dev/gpiomem`・`/dev/gpiochip0` / `1` / `2` / `4` あり。初期状態では `/dev/i2c-1` が無い場合あり（有効化後に利用） |
| start mapping | `sysfs=yes` / `gpiomem=/dev/gpiomem` / `gpiochip=0,1,2,4` / `i2c-1=yes` |
| capability | `gpio=sysfs` / `i2c=i2c-dev` |
| GPIO | WebSocket `gpio.export`（port `26` / `out`）成功。gpiochip 専用 backend は不要 |
| I2C | I2C 有効化後に `i2c-dev` backend を選択 |
| WebSocket | 接続、および `gpio.export` の request/response 成功 |
| cleanup | 切断時の session cleanup で未 unexport pin が消える |
| known limitations | Raspbian OS 32-bit（`armv7l` / `6.18.34+rpt-rpi-v7`）の host path 確認は実施済み。Runtime E2E は [#135](https://github.com/gurezo/chirimen-raspi-docker/issues/135) |

### Pi 4 実機検証（#98）

Raspberry Pi 4（Raspbian OS 64-bit / `aarch64` / kernel `6.18.34+rpt-rpi-v8`）で次を確認済み。

| 項目 | 結果 |
| --- | --- |
| host paths | `/sys/class/gpio`・`/dev/gpiomem`・`/dev/gpiochip0` / `1` / `4` あり。初期状態では `/dev/i2c-1` が無い場合あり（有効化後に利用） |
| start mapping | `sysfs=yes` / `gpiomem=/dev/gpiomem` / `gpiochip=0,1,4` / `i2c-1=yes` |
| capability | `gpio=sysfs` / `i2c=i2c-dev` |
| GPIO | WebSocket `gpio.export`（port `26` / `out`）成功。gpiochip 専用 backend は不要 |
| I2C | I2C 有効化後に `i2c-dev` backend を選択 |
| WebSocket | 接続、および `gpio.export` の request/response 成功 |
| cleanup | 切断時の session cleanup で未 unexport pin が消える |

### Pi 5 実機検証（#99）

Raspberry Pi 5 Model B Rev 1.0（Raspbian OS 64-bit / `aarch64` / kernel `6.18.34+rpt-rpi-2712`）で次を確認済み。

| 項目 | 結果 |
| --- | --- |
| capability | `gpio=sysfs` / `i2c=i2c-dev` |
| GPIO | Case A。`node-web-gpio` の read (`in`) / write (`out`) 成功。gpiochip 専用 backend は不要 |
| I2C | `requestI2CAccess` + port `1` scan 成功（slave 未接続時は空配列で可） |
| WebSocket | 接続、および `gpio.export` / `write` / `unexport` の request/response 成功 |
| cleanup | 切断時の session cleanup で未 unexport pin が消える。`docker compose down` 後も残留なし |
| volumes | `/sys/class/gpio` に加え `/sys/devices` が必要（無いと container 内で EROFS） |

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
