# Docker 構成

Raspberry Pi 上で CHIRIMEN Runtime（`apps/server`）を Docker / Compose で起動する方針を記録する。

関連:

- 親 Issue: [#6 Phase 6: CI, Documentation and Release](https://github.com/gurezo/chirimen-raspi-docker/issues/6)
- 子 Issue: [#45 Architecture / Guide docs を整備する](https://github.com/gurezo/chirimen-raspi-docker/issues/45)
- 子 Issue: [#122 Docker 起動時の GPIO device mapping を capability-aware にする](https://github.com/gurezo/chirimen-raspi-docker/issues/122)
- 子 Issue: [#116 I2C Scan の実機検証を行う](https://github.com/gurezo/chirimen-raspi-docker/issues/116)
- [overview.md](./overview.md)
- [browser-editor.md](./browser-editor.md)（Phase 8 Editor 選定。image は #174。Compose は #175。永続化は #176。optional profile は #177。初期設定 / extension は #178）
- [Getting Started](../guides/getting-started.md)
- [I2C Scan](../guides/i2c-scan.md)
- [I2C Scan 検証仕様](../examples/i2c-scan.md)

## 方針

- カスタム Raspberry Pi イメージは作成しない
- Docker は配布・実行手段であり、中心の責務は Runtime / Protocol / Polyfill
- 推奨入口は [`scripts/start.sh`](../../scripts/start.sh)（capability-aware device mapping）
- ベース定義は root の [`compose.yaml`](../../compose.yaml)
- サポート対象は Raspberry Pi 3 B+ / 4 / 5 の Raspbian OS 64-bit（Node 24）
- 32-bit OS はサポート対象外（`Dockerfile.32bit` は削除しない）

```sh
chmod +x scripts/start.sh
./scripts/start.sh            # Runtime only
./scripts/start.sh --editor   # Runtime + Browser Editor
```

## Compose サービス

[`compose.yaml`](../../compose.yaml) は `chirimen-server` と `chirimen-editor` を定義する（[#175](https://github.com/gurezo/chirimen-raspi-docker/issues/175)）。`depends_on` は付けない。どちらか一方だけ `docker compose restart` できる。Editor に GPIO / I2C device は渡さない。

既定は Runtime only である（[#177](https://github.com/gurezo/chirimen-raspi-docker/issues/177)）。

| 利用方法 | Compose | 推奨入口 |
| --- | --- | --- |
| Runtime only（既定） | `docker compose up` | `./scripts/start.sh` |
| Runtime + Editor | `docker compose --profile editor up` | `./scripts/start.sh --editor` |

`COMPOSE_PROFILES=editor` も Compose 標準として同じ profile を有効にする。

### chirimen-server

| 項目 | 値 |
| --- | --- |
| Service | `chirimen-server` |
| Dockerfile | [`docker/server/Dockerfile`](../../docker/server/Dockerfile)（Node 24）。32-bit 用 [`Dockerfile.32bit`](../../docker/server/Dockerfile.32bit) はサポート対象外 |
| Image | `chirimen-raspi-docker/server:phase1` |
| Port | `33330`（host / container） |
| ENV | `HOST=0.0.0.0`, `PORT=33330` |

### chirimen-editor

Editor は Hardware Runtime ではない。`devices` / `privileged` / `/sys/class/gpio` / `/sys/devices` は付けない。選定の正本は [browser-editor.md](./browser-editor.md)。image は [#174](https://github.com/gurezo/chirimen-raspi-docker/issues/174)。

| 項目 | 値 |
| --- | --- |
| Service | `chirimen-editor` |
| Profile | `editor`（[#177](https://github.com/gurezo/chirimen-raspi-docker/issues/177)。既定の `docker compose up` では起動しない） |
| Dockerfile | [`docker/editor/Dockerfile`](../../docker/editor/Dockerfile) |
| Image | `chirimen-raspi-docker/editor:4.132.0` |
| Port | `127.0.0.1:8080:8080`（LAN 公開は [#181](https://github.com/gurezo/chirimen-raspi-docker/issues/181)） |
| Workspace | bind `./docs/examples` → `/home/coder/project`（git 管理。container 削除後も残る） |
| Extensions / user-data | named volume `chirimen-editor-local` → `/home/coder/.local` |
| Config | named volume `chirimen-editor-config` → `/home/coder/.config`（password 含む） |
| User | `user` + `DOCKER_USER`（`fixuid`）。`start.sh --editor` は host の uid/gid。Compose 直接は `CHIRIMEN_EDITOR_*`、未設定時は `1000` / `coder`。root 禁止 |
| Architecture | `linux/amd64`, `linux/arm64`。32-bit OS はサポート対象外 |
| Network | Compose default。`depends_on` なし |
| GPIO / I2C | 渡さない |

永続化は [#176](https://github.com/gurezo/chirimen-raspi-docker/issues/176)。`docker compose down`（`-v` なし）は named volume を残す。`docker compose down -v` は設定・拡張・password を消す。workspace の bind mount は消えない。正本は [browser-editor.md の Workspace volume](./browser-editor.md#workspace-volume)。

### 起動と health check

Runtime only:

```sh
./scripts/start.sh
curl http://localhost:33330/health
```

Runtime + Editor:

```sh
./scripts/start.sh --editor
curl http://localhost:33330/health
curl -fsS http://127.0.0.1:8080/healthz
```

`/healthz` の `status` が `expired` でも HTTP 200 ならプロセスは生存している。server の期待する応答例:

```json
{
  "name": "chirimen-raspi-docker-server",
  "status": "ok",
  "version": "0.0.1"
}
```

独立 restart の確認例（Editor を profile 付きで起動したあと）:

```sh
docker compose --profile editor restart chirimen-editor
curl -fsS http://127.0.0.1:33330/health
docker compose restart chirimen-server
curl -fsS http://127.0.0.1:8080/healthz
```

## Editor image（単独起動）

推奨入口は Compose / `./scripts/start.sh`。本節は image 単独の build / `docker run`（[#174](https://github.com/gurezo/chirimen-raspi-docker/issues/174)）。選定の正本は [browser-editor.md](./browser-editor.md)。

Editor は Hardware Runtime ではない。`/dev/gpio*` / `/dev/i2c-1` / `/sys/class/gpio` は渡さない。

| 項目 | 値 |
| --- | --- |
| Dockerfile | [`docker/editor/Dockerfile`](../../docker/editor/Dockerfile) |
| Base | `codercom/code-server:4.132.0`（`latest` 禁止） |
| Image | `chirimen-raspi-docker/editor:4.132.0` |
| Port | `8080` |
| User | `coder`（UID 1000。root ではない）。実行時は `-u "$(id -u):$(id -g)"` と `DOCKER_USER`（`fixuid`） |
| Architecture | `linux/amd64`, `linux/arm64`。`arm32` / `armv7` は非対応（`Dockerfile.32bit` は作らない） |
| Workspace | `/home/coder/project` |
| Extensions / user-data | `/home/coder/.local` |
| Config | `/home/coder/.config` |
| Health | `GET /healthz`（認証不要。HTTP 200 なら healthy。JSON の `expired` もプロセス生存） |
| Extra packages | なし。公式 image の `git` / `curl` / `nano` 等を必要最小限とする。必須 extension のプリインストールもしない（[#178](https://github.com/gurezo/chirimen-raspi-docker/issues/178)。推奨は [`docs/examples/.vscode`](../examples/.vscode/)） |

### build

build context は `docker/editor`（リポジトリ全体は COPY しない）。

```sh
docker build -f docker/editor/Dockerfile -t chirimen-raspi-docker/editor:4.132.0 docker/editor
```

Raspberry Pi 3 / 4 / 5 の 64-bit OS と同じ `linux/arm64` を明示する場合:

```sh
docker buildx build --platform linux/arm64 \
  -f docker/editor/Dockerfile -t chirimen-raspi-docker/editor:4.132.0 --load docker/editor
```

実機起動を `Supported` とは書かない。Pi 3 / 4 / 5 での Editor 検証は [#182](https://github.com/gurezo/chirimen-raspi-docker/issues/182)。

### start（`docker run`。Compose を使わない場合）

検証時の bind は `127.0.0.1`。LAN 公開と認証方針は [#181](https://github.com/gurezo/chirimen-raspi-docker/issues/181)。uid は公式どおり host の `id -u` / `id -g` と `DOCKER_USER`（[#176](https://github.com/gurezo/chirimen-raspi-docker/issues/176)）。

```sh
docker run --rm --name chirimen-editor -p 127.0.0.1:8080:8080 \
  -u "$(id -u):$(id -g)" \
  -e "DOCKER_USER=$(id -un)" \
  -v "$PWD/docs/examples:/home/coder/project" \
  -v chirimen-editor-local:/home/coder/.local \
  -v chirimen-editor-config:/home/coder/.config \
  chirimen-raspi-docker/editor:4.132.0
```

`--device` や `/sys/class/gpio` は付けない。

Browser で `http://127.0.0.1:8080` を開く。初回 password は `config.yaml` に生成される。

```sh
docker exec chirimen-editor cat /home/coder/.config/code-server/config.yaml
curl -fsS http://127.0.0.1:8080/healthz
```

`/healthz` の `status` が `expired` でも HTTP 200 ならプロセスは生存している。`grep alive` は使わない。

### image size

追加の apt パッケージは入れない。size は upstream `codercom/code-server:4.132.0` とほぼ同じ。

Docker Hub の compressed size（tag `4.132.0`、2026-08-10）:

| Architecture | compressed |
| --- | --- |
| `linux/arm64` | 約 361 MiB（377877276 bytes） |
| `linux/amd64` | 約 364 MiB（381680763 bytes） |

build 後は次で確認する。

```sh
docker image ls chirimen-raspi-docker/editor:4.132.0
```

## Dockerfile（multi-stage）

stage 構成は 64-bit を正とする。32-bit 用ファイルは残すがサポート対象外である。

| OS | ファイル | ベース | 備考 |
| --- | --- | --- | --- |
| 64-bit（`aarch64` / `x86_64` など） | [`docker/server/Dockerfile`](../../docker/server/Dockerfile) | `node:24-bookworm-slim` | サポート対象。`compose.yaml` の default |
| 32-bit（`armv7l` など） | [`docker/server/Dockerfile.32bit`](../../docker/server/Dockerfile.32bit) | `node:22-bookworm-slim` | サポート対象外。削除はしない |

`./scripts/start.sh` のサポート対象は 64-bit OS である。`docker compose up --build` を直接使うと 64-bit 用 `Dockerfile` になる。

| Stage | 役割 |
| --- | --- |
| `base` | 上記の Node slim image、corepack で pnpm を有効化 |
| `deps` | native addon 用に `python3` / `make` / `g++` を入れ、`npm_config_nodedir=/usr/local` で lockfile から依存を install |
| `build` | 64-bit: `pnpm nx build server`。32-bit 用 `Dockerfile.32bit` は `node scripts/build-server.mjs`（サポート対象外） |
| `runtime` | ビルド成果を含む workspace を起動。`node apps/server/dist/main.js`（build tools は含めない） |

`deps` の build tools は `i2c-bus`（`node-web-i2c` 経由）などが `node-gyp` で native rebuild するために必要。pnpm は `nodedir` を渡さないため、未設定だと node-gyp が `nodejs.org` から Node headers を取得する。公式 Node image の `/usr/local` を `npm_config_nodedir` に指定し、その通信を避ける（Pi 上の Docker DNS で `EAI_AGAIN` になりやすい）。`runtime` は `base` から作るため、最終 image にコンパイラは残らない。

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

`scripts/start.sh` は doctor / Runtime と同じパス基準で host を探査し、存在する device だけを一時 Compose override に書いて `docker compose -f compose.yaml -f <override> up` する。欠如 device はスキップして起動を続ける（Runtime が capability を `unavailable` 等で報告する）。サポート対象は 64-bit OS である。

現在の server image は root で起動するため、当面 `group_add`（`gpio` / `i2c` グループ）は必須ではない。

container 内の確認例:

```sh
docker compose exec chirimen-server ls -l /sys/class/gpio
docker compose exec chirimen-server ls -l /dev/gpiomem* /dev/gpiochip* /dev/i2c-1 2>/dev/null || true
```

## Compatibility matrix

Raspberry Pi 3 / 4 / 5 の対応状態は、モデル名だけではなく Hardware Capability Detection と Runtime Backend の実機検証結果として記録する。**サポート対象は Raspbian OS 64-bit** である。32-bit OS はサポート対象外。32-bit の Verified 行は [#135](https://github.com/gurezo/chirimen-raspi-docker/issues/135) の記録として残し、`Supported` とは書かない。未検証項目も `Supported` と書かない。

- **Browser E2E**: 実ブラウザ + polyfill UI ではなく、container 内 WebSocket クライアントによる protocol E2E。`Supported` とは書かない。web-demo の I2C Scan は下記「I2C Scan 実機検証（#116）」
- **I2C**: 初期状態で `/dev/i2c-1` が無い場合あり。有効化後に `i2c-dev`。既知 slave（ADT7410 / `0x48`）の Browser Scan は [#116](https://github.com/gurezo/chirimen-raspi-docker/issues/116)
- 詳細は下記の Pi 3 B+（#97） / Pi 4（#98） / Pi 5（#99）実機検証。32-bit の記録は #135（サポート対象外）

### Raspberry Pi 3 A+

| OS | Kernel | Arch | GPIO Capability | GPIO Backend | I2C Backend | Browser E2E | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TBD | TBD | TBD | TBD | TBD | TBD | TBD | Not verified |

ハードウェアスペック不足のためサポート対象外。`Supported` と書かない。

### Raspberry Pi 3 B+

| OS | Kernel | Arch | GPIO Capability | GPIO Backend | I2C Backend | Browser E2E | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Raspbian OS 64-bit | `6.18.34+rpt-rpi-v8` | `aarch64` | sysfs（`/sys/class/gpio`） | sysfs | i2c-dev | WebSocket `gpio.export` 成功 | Verified |
| Raspbian OS 32-bit | `6.18.34+rpt-rpi-v7` | `armv7l` | sysfs（`/sys/class/gpio`） | sysfs | i2c-dev | WebSocket `gpio.export` 成功 | Verified（サポート対象外） |

Raspbian OS 32-bit はサポート対象外。[#135](https://github.com/gurezo/chirimen-raspi-docker/issues/135) の Runtime E2E 記録として残す。`Supported` とは書かない。32-bit は `armv7l` + Node 22 / `Dockerfile.32bit`。

### Raspberry Pi 4

| OS | Kernel | Arch | GPIO Capability | GPIO Backend | I2C Backend | Browser E2E | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Raspbian OS 64-bit | `6.18.34+rpt-rpi-v8` | `aarch64` | sysfs（`/sys/class/gpio`） | sysfs | i2c-dev | WebSocket `gpio.export` 成功 | Verified |
| Raspbian OS 32-bit | `6.18.34+rpt-rpi-v8` | `aarch64` | sysfs（`/sys/class/gpio`） | sysfs | i2c-dev | WebSocket `gpio.export` 成功 | Verified（サポート対象外） |

Raspbian OS 32-bit はサポート対象外。[#135](https://github.com/gurezo/chirimen-raspi-docker/issues/135) の Runtime E2E 記録として残す。`Supported` とは書かない。Pi 4 の 32-bit OS は 64-bit kernel（`aarch64` / `v8`）が default。検証済み機種は Model B Rev 1.4。

### Raspberry Pi 5

| OS | Kernel | Arch | GPIO Capability | GPIO Backend | I2C Backend | Browser E2E | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Raspbian OS 64-bit | `6.18.34+rpt-rpi-2712` | `aarch64` | sysfs（`/sys/class/gpio`） | sysfs | i2c-dev | WebSocket `gpio.export` / `write` / `unexport` 成功 | Verified |
| Raspbian OS 32-bit | `6.18.34+rpt-rpi-v8` | `aarch64` | sysfs（`/sys/class/gpio`） | sysfs | i2c-dev | WebSocket `gpio.export` 成功 | Verified（サポート対象外） |

Raspbian OS 32-bit はサポート対象外。[#135](https://github.com/gurezo/chirimen-raspi-docker/issues/135) の Runtime E2E 記録として残す。`Supported` とは書かない。Pi 5 の 32-bit OS は 64-bit kernel（`aarch64` / `v8`）が default（64-bit OS の `2712` とは異なる）。検証済み機種は Model B Rev 1.0。

## Raspberry Pi 3 / 4 と 5

- **同一手順**: Pi 3 / 4 / 5 とも `./scripts/start.sh`。モデルごとの `compose.yaml` 手編集は不要
- **`gpiomem`**: Pi 3 / 4 は `/dev/gpiomem`、Pi 5 は `/dev/gpiomem0`–`4`。いずれも任意（Runtime の必須条件ではない）
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
| known limitations | Raspbian OS 32-bit の Runtime E2E は下記「Pi 3 B+ 32-bit 実機検証（#135）」 |

### Pi 3 B+ 32-bit 実機検証（#135）

サポート対象外。Raspberry Pi 3 Model B+（Raspbian OS 32-bit / `armv7l` / kernel `6.18.34+rpt-rpi-v7`）での Runtime E2E 記録。32-bit では Node 24 公式 image に `linux/arm/v7` が無いため、当時は `./scripts/start.sh --32bit` が [`docker/server/Dockerfile.32bit`](../../docker/server/Dockerfile.32bit)（Node 22）を選んだ。

| 項目 | 結果 |
| --- | --- |
| host paths | `/sys/class/gpio`・`/dev/gpiomem`・`/dev/gpiochip0` / `1` / `2` / `4` あり。`/dev/i2c-1` あり |
| start mapping | `sysfs=yes` / `gpiomem=/dev/gpiomem` / `gpiochip=0,1,2,4` / `i2c-1=yes` |
| capability | `gpio=sysfs` / `i2c=i2c-dev` |
| GPIO | WebSocket `gpio.export`（port `26` / `out`）成功。gpiochip 専用 backend は不要 |
| I2C | `/dev/i2c-1` 存在時に `i2c-dev` backend を選択 |
| WebSocket | 接続、および `gpio.export` の request/response 成功 |
| cleanup | 切断時の session cleanup で未 unexport pin が消える。`docker compose down` 後も残留なし |
| image | `chirimen-raspi-docker/server:phase1-32bit`（esbuild bundle） |
| Status | Verified（サポート対象外。`Supported` とは書かない） |

### Pi 4 実機検証（#98）

Raspberry Pi 4 Model B Rev 1.4（Raspbian OS 64-bit / `aarch64` / kernel `6.18.34+rpt-rpi-v8`）で次を確認済み。

| 項目 | 結果 |
| --- | --- |
| doctor | All checks passed。architecture は `aarch64`。`[ capabilities ] gpio=sysfs i2c=i2c-dev` |
| host paths | `/sys/class/gpio`（chip0 / chip1、gpiochip512 / gpiochip570）・`/dev/gpiomem`・`/dev/gpiochip0` / `1` / `4` あり。初期状態では `/dev/i2c-1` が無い場合あり（有効化後に利用） |
| start mapping | `sysfs=yes` / `gpiomem=/dev/gpiomem` / `gpiochip=0,1,4` / `i2c-1=yes` |
| image | `chirimen-raspi-docker/server:phase1`（`./scripts/start.sh --64bit`） |
| capability | `gpio=sysfs` / `i2c=i2c-dev` |
| GPIO | WebSocket `gpio.export`（port `26` / `out`）成功。gpiochip 専用 backend は不要 |
| I2C | I2C 有効化後に `i2c-dev` backend を選択 |
| WebSocket | 接続、および `gpio.export` の request/response 成功 |
| cleanup | 切断時の session cleanup で未 unexport pin が消える。`docker compose down` 後も残留なし |
| known limitations | Raspbian OS 32-bit は下記「Pi 4 32-bit 実機検証（#135）」 |

### Pi 4 32-bit 実機検証（#135）

サポート対象外。Raspberry Pi 4 Model B Rev 1.4（Raspbian OS 32-bit / kernel `6.18.34+rpt-rpi-v8` / `aarch64`）での Runtime E2E 記録。Pi 4 向け 32-bit OS は 32-bit userland でも **64-bit kernel が default** のため、`uname -m` は `aarch64` になる（Pi 3 B+ 32-bit の `armv7l` / `v7` とは異なる）。

| 項目 | 結果 |
| --- | --- |
| doctor | All checks passed。architecture は `aarch64`。`[ capabilities ] gpio=sysfs i2c=i2c-dev` |
| host paths | `/sys/class/gpio`（chip0 / chip1、gpiochip512 / gpiochip570）・`/dev/gpiomem`・`/dev/gpiochip0` / `1` / `4` あり。`/dev/i2c-1` あり |
| start mapping | `sysfs=yes` / `gpiomem=/dev/gpiomem` / `gpiochip=0,1,4` / `i2c-1=yes` |
| capability | `gpio=sysfs` / `i2c=i2c-dev` |
| GPIO | WebSocket `gpio.export`（port `26` / `out`）成功。gpiochip 専用 backend は不要 |
| I2C | `/dev/i2c-1` 存在時に `i2c-dev` backend を選択 |
| WebSocket | 接続、および `gpio.export` の request/response 成功 |
| cleanup | 切断時の session cleanup で未 unexport pin が消える。`docker compose down` 後も残留なし |
| known limitations | サポート対象外。`uname -m` が `aarch64` のため当時の `start.sh` は 64-bit 用 Dockerfile（Node 24）を選びえた |
| Status | Verified（サポート対象外。`Supported` とは書かない） |

### Pi 5 実機検証（#99）

Raspberry Pi 5 Model B Rev 1.0（Raspbian OS 64-bit / `aarch64` / kernel `6.18.34+rpt-rpi-2712`）で次を確認済み。

| 項目 | 結果 |
| --- | --- |
| doctor | All checks passed。architecture は `aarch64`。`[ capabilities ] gpio=sysfs i2c=i2c-dev` |
| host paths | `/sys/class/gpio`（chip0 / chip10–13、gpiochip512 / 529 / 535 / 567 / 571）・`/dev/gpiomem0`–`4`・`/dev/gpiochip0` / `10` / `11` / `12` / `13` / `4` あり。`/dev/i2c-1` あり |
| start mapping | `sysfs=yes` / `gpiomem=0,1,2,3,4` / `gpiochip=0,10,11,12,13,4` / `i2c-1=yes` |
| image | `chirimen-raspi-docker/server:phase1`（`./scripts/start.sh --64bit`） |
| capability | `gpio=sysfs` / `i2c=i2c-dev` |
| GPIO | Case A。`node-web-gpio` の read (`in`) / write (`out`) 成功。gpiochip 専用 backend は不要 |
| I2C | `requestI2CAccess` + port `1` scan 成功（slave 未接続時は空配列で可）。既知 slave の Browser Scan は下記「I2C Scan 実機検証（#116）」 |
| WebSocket | 接続、および `gpio.export` / `write` / `unexport` の request/response 成功 |
| cleanup | 切断時の session cleanup で未 unexport pin が消える。`docker compose down` 後も残留なし |
| volumes | `/sys/class/gpio` に加え `/sys/devices` が必要（無いと container 内で EROFS） |
| known limitations | Raspbian OS 32-bit は下記「Pi 5 32-bit 実機検証（#135）」 |

### Pi 5 32-bit 実機検証（#135）

サポート対象外。Raspberry Pi 5 Model B Rev 1.0（Raspbian OS 32-bit / kernel `6.18.34+rpt-rpi-v8` / `aarch64`）での Runtime E2E 記録。Pi 5 向け 32-bit OS は 32-bit userland でも **64-bit kernel が default** のため、`uname -m` は `aarch64` になる（64-bit OS の kernel `2712` とは異なる。Pi 3 B+ 32-bit の `armv7l` / `v7` とも異なる）。

| 項目 | 結果 |
| --- | --- |
| doctor | All checks passed。architecture は `aarch64`。`[ capabilities ] gpio=sysfs i2c=i2c-dev` |
| host paths | `/sys/class/gpio`（chip0 / chip10–13、gpiochip512 / 529 / 535 / 567 / 571）・`/dev/gpiomem0`–`4`・`/dev/gpiochip0` / `10` / `11` / `12` / `13` / `4` あり。`/dev/i2c-1` あり |
| start mapping | `sysfs=yes` / `gpiomem=0,1,2,3,4` / `gpiochip=0,10,11,12,13,4` / `i2c-1=yes` |
| capability | `gpio=sysfs` / `i2c=i2c-dev` |
| GPIO | WebSocket `gpio.export`（port `26` / `out`）成功。gpiochip 専用 backend は不要 |
| I2C | `/dev/i2c-1` 存在時に `i2c-dev` backend を選択 |
| WebSocket | 接続、および `gpio.export` の request/response 成功 |
| cleanup | 切断時の session cleanup で未 unexport pin が消える。`docker compose down` 後も残留なし |
| image | `chirimen-raspi-docker/server:phase1-32bit`（当時 `./scripts/start.sh --32bit`、esbuild bundle） |
| known limitations | サポート対象外。`uname -m` が `aarch64` のため当時の `start.sh` は 64-bit 用 Dockerfile（Node 24）を選びえた。native rebuild の `EAI_AGAIN` は [#167](https://github.com/gurezo/chirimen-raspi-docker/pull/167) の `nodedir` 設定で回避する |
| Status | Verified（サポート対象外。`Supported` とは書かない） |

host 側の有効化・診断は [raspberry-pi-setup.md](../guides/raspberry-pi-setup.md) と `scripts/doctor.sh` / `scripts/enable-i2c.sh` を参照。

### I2C Scan 実機検証（#116）

検証用 slave は **ADT7410**（expected `0x48`）。配線の正本は [i2c-scan.md](../examples/i2c-scan.md)。センサ機能 Example は対象外。

| 項目 | 結果 |
| --- | --- |
| device | ADT7410。A0 / A1 = GND → address `0x48` |
| I2C1 pins | Pi 3 / 4 / 5 で物理 pin 3 = SDA（BCM 2）、pin 5 = SCL（BCM 3）。モデルごとに配線を変えない |
| host `/dev/i2c-1` | Pi 3 B+（#97）/ Pi 4（#98）/ Pi 5（#99）で確認済み。初期状態で無い場合は `scripts/enable-i2c.sh` |
| Runtime scan | Pi 5（#99、Raspbian OS 64-bit / `aarch64` / `6.18.34+rpt-rpi-2712`）で `requestI2CAccess` + port `1` scan 成功。slave 未接続時は空配列 |
| Browser Scan | web-demo `#/i2c-scan`。probe は Runtime `scanI2cPort` と同じ `open` + `writeByte(0x00)`（範囲 `0x03`–`0x77`）。[#114](https://github.com/gurezo/chirimen-raspi-docker/issues/114) / [#115](https://github.com/gurezo/chirimen-raspi-docker/issues/115) |
| expected | 配線後 Scan で hex 一覧に `0x48`。空配列は本検証では失敗 |
| Browser E2E 列 | Compatibility matrix の Browser E2E は protocol E2E のまま。実ブラウザ Scan は本節 |

GPIO26（LED）/ GPIO5（スイッチ）とはピンが重ならない。

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

Editor Compose service は [`compose.yaml`](../../compose.yaml) の `chirimen-editor`（[#175](https://github.com/gurezo/chirimen-raspi-docker/issues/175)）。永続化は [#176](https://github.com/gurezo/chirimen-raspi-docker/issues/176)。optional profile は [#177](https://github.com/gurezo/chirimen-raspi-docker/issues/177)（`docker compose --profile editor up` / `./scripts/start.sh --editor`）。
