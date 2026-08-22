# Docker 構成

Raspberry Pi 上で CHIRIMEN Runtime（`apps/server`）を Docker / Compose で起動する方針を記録する。

関連:

- 親 Issue: [#6 Phase 6: CI, Documentation and Release](https://github.com/gurezo/chirimen-raspi-docker/issues/6)
- 子 Issue: [#45 Architecture / Guide docs を整備する](https://github.com/gurezo/chirimen-raspi-docker/issues/45)
- 子 Issue: [#122 Docker 起動時の GPIO device mapping を capability-aware にする](https://github.com/gurezo/chirimen-raspi-docker/issues/122)
- 子 Issue: [#116 I2C Scan の実機検証を行う](https://github.com/gurezo/chirimen-raspi-docker/issues/116)
- [overview.md](./overview.md)
- [Compatibility matrix](./compatibility.md)
- [browser-editor.md](./browser-editor.md)（Phase 8 Editor 選定。image は #174。Compose は #175。永続化は #176。既定の全サーバー起動は #208（#177 の optional profile を逆転）。初期設定は #178。Example 編集 / 静的 serve は #179。Web Demo Compose は #180。Security は #181。Extension は #201）
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
./scripts/start.sh                    # Runtime + Browser Editor + Examples + Web Demo（127.0.0.1）
./scripts/start.sh --lan              # 同上。Editor / Example / Web Demo を LAN 公開
./scripts/start.sh --32bit            # Runtime only（32-bit OS。サポート対象外）
```

## Compose サービス

[`compose.yaml`](../../compose.yaml) は `chirimen-server`、`chirimen-editor`、`chirimen-examples`、`chirimen-web-demo` を定義する（[#175](https://github.com/gurezo/chirimen-raspi-docker/issues/175) / [#179](https://github.com/gurezo/chirimen-raspi-docker/issues/179) / [#180](https://github.com/gurezo/chirimen-raspi-docker/issues/180)）。`depends_on` は付けない。どれか一方だけ `docker compose restart` できる。Editor / Examples / Web Demo に GPIO / I2C device は渡さない。

既定は Runtime + Editor + Examples + Web Demo である（[#208](https://github.com/gurezo/chirimen-raspi-docker/issues/208)）。

| 利用方法 | Compose | 推奨入口 |
| --- | --- | --- |
| Runtime + Editor + Examples + Web Demo（既定） | `docker compose up` | `./scripts/start.sh` |
| 同上 + LAN 公開（8080 / 4173 / 4200） | `CHIRIMEN_PUBLISH_BIND=0.0.0.0 docker compose up` | `./scripts/start.sh --lan` |
| Runtime only | `docker compose up chirimen-server` | `./scripts/start.sh --32bit`（32-bit OS。サポート対象外） |

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
| Dockerfile | [`docker/editor/Dockerfile`](../../docker/editor/Dockerfile) |
| Image | `chirimen-raspi-docker/editor:4.132.0` |
| Port | 既定 `${CHIRIMEN_PUBLISH_BIND:-127.0.0.1}:8080:8080`（Editor）。LAN は `0.0.0.0`（[#181](https://github.com/gurezo/chirimen-raspi-docker/issues/181)）。Internet には出さない |
| Workspace | bind `./docs/examples` → `/home/coder/project`（git 管理。container 削除後も残る） |
| Extra packages | `python3-minimal` のみ（#179 当時。Compose 経路の HTML 配信は `chirimen-examples`）。Node / GPIO / I2C ツールは入れない |
| Extensions / user-data | named volume `chirimen-editor-local` → `/home/coder/.local` |
| Config | named volume `chirimen-editor-config` → `/home/coder/.config`（password 含む。Git に置かない） |
| Auth | Dockerfile `--auth password`。任意ピンは `CHIRIMEN_EDITOR_PASSWORD` / `CHIRIMEN_EDITOR_HASHED_PASSWORD`（start.sh が非空のときだけ渡す）。`auth: none` は使わない |
| User | `user` + `DOCKER_USER`（`fixuid`）。`start.sh` は host の uid/gid。Compose 直接は `CHIRIMEN_EDITOR_*`、未設定時は `1000` / `coder`。root 禁止 |
| Architecture | `linux/amd64`, `linux/arm64`。32-bit OS はサポート対象外 |
| Network | Compose default。`depends_on` なし。`no-new-privileges` / `cap_drop: ALL` は付けない（公式 entrypoint の `fixuid` が setuid を必要とする） |
| GPIO / I2C | 渡さない |

永続化は [#176](https://github.com/gurezo/chirimen-raspi-docker/issues/176)。`docker compose down`（`-v` なし）は named volume を残す。`docker compose down -v` は設定・拡張・password を消す。workspace の bind mount は消えない。正本は [browser-editor.md の Workspace volume](./browser-editor.md#workspace-volume)。

### chirimen-examples

HTML Examples は Hardware Runtime ではない。`devices` / `privileged` / `/sys/class/gpio` / `/sys/devices` は付けない。Browser 内の Polyfill が Runtime の WebSocket へ接続する。正本は [browser-editor.md の Example 編集 / 静的 serve](./browser-editor.md#example-編集--静的-serve179)。

| 項目 | 値 |
| --- | --- |
| Service | `chirimen-examples` |
| Dockerfile | [`docker/examples/Dockerfile`](../../docker/examples/Dockerfile) |
| Image | `chirimen-raspi-docker/examples:phase8` |
| Port | 既定 `${CHIRIMEN_PUBLISH_BIND:-127.0.0.1}:4173:4173`。LAN は Editor と同じ変数 / `--lan`（[#181](https://github.com/gurezo/chirimen-raspi-docker/issues/181)） |
| 配信 | nginx（`nginx:1.30.4-alpine`）が bind `./docs/examples` を静的配信。Editor で保存したファイルは reload で見える |
| Health | `GET /led-blink/`（HTTP 200） |
| Network | Compose default。`depends_on` なし。`security_opt: no-new-privileges:true` |
| GPIO / I2C | 渡さない |

host で `python3 -m http.server 4173` する従来手順も port `4173` を使う。同時には使わない。Compose examples を止めてから host で serve する。

### chirimen-web-demo

Web Demo は Hardware Runtime ではない。`devices` / `privileged` / `/sys/class/gpio` / `/sys/devices` は付けない。Browser 内の Polyfill が Runtime の WebSocket へ接続する（localhost なら `ws://localhost:33330/`、LAN ならページの hostname）。正本は [browser-editor.md の Web Demo 起動](./browser-editor.md#web-demo-起動180)。

| 項目 | 値 |
| --- | --- |
| Service | `chirimen-web-demo` |
| Dockerfile | [`docker/web-demo/Dockerfile`](../../docker/web-demo/Dockerfile) |
| Image | `chirimen-raspi-docker/web-demo:phase8` |
| Port | 既定 `${CHIRIMEN_PUBLISH_BIND:-127.0.0.1}:4200:4200`。LAN は Editor と同じ変数 / `--lan`（[#181](https://github.com/gurezo/chirimen-raspi-docker/issues/181)） |
| 配信 | Vite production build を nginx（`nginx:1.30.4-alpine`）で静的配信。Vite dev-server は動かさない |
| Health | `GET /`（HTTP 200） |
| Network | Compose default。`depends_on` なし。`security_opt: no-new-privileges:true` |
| GPIO / I2C | 渡さない |

host の `pnpm nx serve web-demo`（Vite HMR）も port `4200` を使う。同時には使わない。Compose web-demo を止めてから host で serve する。

### 起動と health check

Runtime + Editor + Examples + Web Demo:

```sh
./scripts/start.sh
curl http://localhost:33330/health
curl -fsS http://127.0.0.1:8080/healthz
curl -fsS http://127.0.0.1:4173/led-blink/
curl -fsS http://127.0.0.1:4200/
```

LAN 公開（Editor / Example / Web Demo のみ。Runtime `33330` は変えない）:

```sh
./scripts/start.sh --lan
```

`./scripts/start.sh` のあと `http://127.0.0.1:4173/led-blink/` などを開く（Compose `chirimen-examples` が起動済み。Run Task **Serve examples** は URL 案内）。Web Demo は `http://127.0.0.1:4200/` を別タブで開く（Run Task **Open Web Demo**）。手順は [browser-editor.md の Example 編集 / 静的 serve](./browser-editor.md#example-編集--静的-serve179) と [Web Demo 起動](./browser-editor.md#web-demo-起動180)。

`/healthz` の `status` が `expired` でも HTTP 200 ならプロセスは生存している。server の期待する応答例:

```json
{
  "name": "chirimen-raspi-docker-server",
  "status": "ok",
  "version": "0.0.1"
}
```

独立 restart の確認例:

```sh
docker compose restart chirimen-editor
curl -fsS http://127.0.0.1:33330/health
docker compose restart chirimen-server
curl -fsS http://127.0.0.1:8080/healthz
docker compose restart chirimen-web-demo
curl -fsS http://127.0.0.1:4200/
docker compose restart chirimen-examples
curl -fsS http://127.0.0.1:4173/led-blink/
```

## Editor image（単独起動）

推奨入口は Compose / `./scripts/start.sh`。本節は image 単独の build / `docker run`（[#174](https://github.com/gurezo/chirimen-raspi-docker/issues/174)）。選定の正本は [browser-editor.md](./browser-editor.md)。

Editor は Hardware Runtime ではない。`/dev/gpio*` / `/dev/i2c-1` / `/sys/class/gpio` は渡さない。

| 項目 | 値 |
| --- | --- |
| Dockerfile | [`docker/editor/Dockerfile`](../../docker/editor/Dockerfile) |
| Base | `codercom/code-server:4.132.0`（`latest` 禁止） |
| Image | `chirimen-raspi-docker/editor:4.132.0` |
| Port | `8080`（Editor）。`4173`（Example 静的サーバ。[#179](https://github.com/gurezo/chirimen-raspi-docker/issues/179)） |
| User | `coder`（UID 1000。root ではない）。実行時は `-u "$(id -u):$(id -g)"` と `DOCKER_USER`（`fixuid`） |
| Architecture | `linux/amd64`, `linux/arm64`。`arm32` / `armv7` は非対応（`Dockerfile.32bit` は作らない） |
| Workspace | `/home/coder/project` |
| Extensions / user-data | `/home/coder/.local` |
| Config | `/home/coder/.config` |
| Health | `GET /healthz`（認証不要。HTTP 200 なら healthy。JSON の `expired` もプロセス生存） |
| Extra packages | `python3-minimal` のみ（[#179](https://github.com/gurezo/chirimen-raspi-docker/issues/179)。Compose では `chirimen-examples` が配信。`docker run` 時の任意手段）。GPIO / I2C ツールと Node は入れない。Extension のプリインストール・推奨もしない（[#201](https://github.com/gurezo/chirimen-raspi-docker/issues/201)） |

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

検証時の bind は既定 `127.0.0.1`。LAN は `-p 0.0.0.0:8080:8080` など（Compose なら `--lan`）。認証は image の `--auth password`。uid は公式どおり host の `id -u` / `id -g` と `DOCKER_USER`（[#176](https://github.com/gurezo/chirimen-raspi-docker/issues/176)）。

```sh
docker run --rm --name chirimen-editor \
  -p 127.0.0.1:8080:8080 -p 127.0.0.1:4173:4173 \
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

追加の apt パッケージは `python3-minimal` のみ（#179）。GPIO / I2C ツールと Node は入れない。size は upstream `codercom/code-server:4.132.0` に python3 分が乗る。

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

## Compatibility

推奨環境と実機検証の正本は [Compatibility matrix](./compatibility.md) である。サポート対象は Raspberry Pi 3 B+ / 4 / 5 の Raspbian OS 64-bit。

## 非 Pi 環境での制限

任意 device が無くても `./scripts/start.sh` は起動を試みる（GPIO / I2C は unavailable）。`/sys/class/gpio` が host に無い場合は volume bind の挙動が環境依存のため、GPIO 検証は Raspberry Pi 上で行う。

代替:

- `pnpm install` のうえ `npx nx build server` / `npx nx serve server` で TypeScript / server 開発を続ける

障害の切り分けは [troubleshooting.md](../guides/troubleshooting.md) を参照。

## 未実装（将来）

Wiki で想定している次は、現状未実装。

| 要素 | 予定役割 |
| --- | --- |
| `docker/nginx` | reverse proxy / TLS 終端。Web Demo 静的配信は [`docker/web-demo`](../../docker/web-demo/Dockerfile)（[#180](https://github.com/gurezo/chirimen-raspi-docker/issues/180)） |

Editor Compose service は [`compose.yaml`](../../compose.yaml) の `chirimen-editor`（[#175](https://github.com/gurezo/chirimen-raspi-docker/issues/175)）。永続化は [#176](https://github.com/gurezo/chirimen-raspi-docker/issues/176)。#177 の optional profile は [#208](https://github.com/gurezo/chirimen-raspi-docker/issues/208) で既定の全サーバー起動へ戻した（`docker compose up` / `./scripts/start.sh`）。Example 静的 serve は [#179](https://github.com/gurezo/chirimen-raspi-docker/issues/179)（Compose `chirimen-examples`、既定 `127.0.0.1:4173`）。Web Demo は [#180](https://github.com/gurezo/chirimen-raspi-docker/issues/180)（既定 `127.0.0.1:4200`）。Security（bind / 認証 / LAN）は [#181](https://github.com/gurezo/chirimen-raspi-docker/issues/181)。
