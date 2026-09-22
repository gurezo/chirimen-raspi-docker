# Docker 構成

Raspberry Pi 上で CHIRIMEN Runtime（`apps/server`）を Docker / Compose で起動する方針を記録する。

関連:

- 親 Issue: [#6 Phase 6: CI, Documentation and Release](https://github.com/gurezo/chirimen-raspi-docker/issues/6)
- 子 Issue: [#45 Architecture / Guide docs を整備する](https://github.com/gurezo/chirimen-raspi-docker/issues/45)
- 子 Issue: [#122 Docker 起動時の GPIO device mapping を capability-aware にする](https://github.com/gurezo/chirimen-raspi-docker/issues/122)
- 子 Issue: [#116 I2C Scan の実機検証を行う](https://github.com/gurezo/chirimen-raspi-docker/issues/116)
- [overview.md](./overview.md)
- [Compatibility](./compatibility.md)
- [browser-editor.md](./browser-editor.md)（Phase 8 Editor 選定。image は #174。Compose は #175。永続化は #176。既定の全サーバー起動は #208（#177 の optional profile を逆転）。初期設定は #178。Example 編集 / 静的 serve は #179。旧 Web Demo Compose は #180（#263 で廃止し Catalog を `:4200` へ）。Security は #181。Extension は #201。利用ガイドは #183）
- [Getting Started](../guides/getting-started.md)
- [Browser Development Environment](../guides/browser-development.md)
- [I2C Scan](../guides/i2c-scan.md)
- [I2C Scan 検証仕様](../examples/i2c-scan.md)

## 方針

- カスタム Raspberry Pi イメージは作成しない
- Docker は配布・実行手段であり、中心の責務は Runtime / Protocol / Polyfill
- **Runtime 操作**の入口は `docker compose up -d` / `down`（初心者正本は [Getting Started](../guides/getting-started.md)）
- Development / 上級者向けの起動補助は [`scripts/start.sh`](../../scripts/start.sh)（capability-aware device mapping・LAN・on-device build）
- ベース定義は root の [`compose.yaml`](../../compose.yaml)
- サポート対象は Raspberry Pi 3 B+ / 4 / 5 の Raspberry Pi OS 64-bit（Node 24）。標準環境は Raspberry Pi OS 64-bit Desktop（Lite も可）
- Pi 3 B+ は **Runtime-only**（compose `up` / `down` のみ。on-device Docker build は Pi 4 / Pi 5 のみ。[Compatibility](./compatibility.md#development--docker-build-support)）
- 32-bit OS は Unsupported（`Dockerfile.32bit` は [#339](https://github.com/gurezo/chirimen-raspi-docker/issues/339) で削除済み。背景は [Historical: 32-bit Compatibility](./compatibility-32bit.md)）

Runtime（beginner / 機種共通）:

```sh
docker compose up -d
docker compose down
```

Development / 上級者（device mapping・LAN・build）:

```sh
chmod +x scripts/start.sh
./scripts/start.sh                    # Pi 4 / Pi 5。既定で --build（Runtime + Editor + Examples + Catalog）
./scripts/start.sh --lan              # 同上。Editor / Example / Catalog を LAN 公開
./scripts/start.sh --no-build         # Pi 3 B+ Runtime-only（build なし）
./scripts/start.sh --lan --no-build   # Pi 3 B+。LAN 公開かつ build なし
```

## Compose サービス

[`compose.yaml`](../../compose.yaml) は `chirimen-server`、`chirimen-editor`、`chirimen-examples`、`chirimen-example-catalog` を定義する（[#175](https://github.com/gurezo/chirimen-raspi-docker/issues/175) / [#179](https://github.com/gurezo/chirimen-raspi-docker/issues/179) / [#254](https://github.com/gurezo/chirimen-raspi-docker/issues/254) / [#263](https://github.com/gurezo/chirimen-raspi-docker/issues/263)）。`depends_on` は付けない。どれか一方だけ `docker compose restart` できる。Editor / Examples / Catalog に GPIO / I2C device は渡さない。

既定は Runtime + Editor + Examples + Catalog である（[#208](https://github.com/gurezo/chirimen-raspi-docker/issues/208) / [#254](https://github.com/gurezo/chirimen-raspi-docker/issues/254)）。

| Port | Service | Role |
| --- | --- | --- |
| 33330 | chirimen-server | Hardware Runtime / WebSocket |
| 8080 | chirimen-editor | Browser Editor / code-server |
| 4173 | chirimen-examples | Example Server / Runtime Examples |
| 4200 | chirimen-example-catalog | Example Catalog |

| 利用方法 | Compose | 入口 | 区分 |
| --- | --- | --- | --- |
| Runtime + Editor + Examples + Catalog（Pi 3 / 4 / 5） | `docker compose up -d` | `docker compose up -d` | Runtime |
| 停止 | `docker compose down` | `docker compose down` | Runtime |
| Development（Pi 4 / Pi 5。既定で build） | `docker compose up --build` | `./scripts/start.sh` | Development |
| 同上 + LAN 公開（8080 / 4173 / 4200） | `CHIRIMEN_PUBLISH_BIND=0.0.0.0 docker compose up --build` | `./scripts/start.sh --lan` | Development |
| Pi 3 B+ で start.sh を使う場合 | `docker compose up`（build なし） | `./scripts/start.sh --no-build` | Development / 上級者 |
| Runtime only（単一サービス） | `docker compose up chirimen-server` | 通常フローではない。当時の 32-bit Runtime only は [32-bit Compatibility](./compatibility-32bit.md) | — |

### chirimen-server

| 項目 | 値 |
| --- | --- |
| Service | `chirimen-server` |
| Dockerfile | [`docker/server/Dockerfile`](../../docker/server/Dockerfile)（Node 24）。唯一の supported path |
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
| Workspace | bind `./workspace` → `/home/coder/project`（git 管理。container 削除後も残る） |
| Extra packages | `python3-minimal` のみ（#179 当時。Compose 経路の HTML 配信は `chirimen-examples`）。Node / GPIO / I2C ツールは入れない |
| Extensions / user-data | named volume `chirimen-editor-local` → `/home/coder/.local` |
| Config | named volume `chirimen-editor-config` → `/home/coder/.config`（password 含む。Git に置かない） |
| Auth | Dockerfile `--auth password`。対話の初回 `start.sh` が `.env` の `CHIRIMEN_EDITOR_PASSWORD` を書く（#269）。非空のときだけ container へ渡す。`auth: none` は使わない |
| User | `user` + `DOCKER_USER`（`fixuid`）。`start.sh` は host の uid/gid。Compose 直接は `CHIRIMEN_EDITOR_*`、未設定時は `1000` / `coder`。root 禁止 |
| Architecture | `linux/amd64`, `linux/arm64`。32-bit OS は Unsupported |
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
| 配信 | nginx（`nginx:1.30.4-alpine`）が bind `./workspace` を静的配信。Editor で保存したファイルは reload で見える |
| Health | `GET /led-blink/`（HTTP 200） |
| Network | Compose default。`depends_on` なし。`security_opt: no-new-privileges:true` |
| GPIO / I2C | 渡さない |

host で `python3 -m http.server 4173` する従来手順も port `4173` を使う。同時には使わない。Compose examples を止めてから host で serve する。

### chirimen-example-catalog

Example Catalog は Hardware Runtime ではない。題材の発見入口であり、実行コードそのものではない。`devices` / `privileged` / `/sys/class/gpio` / `/sys/devices` は付けない。ported Example の「実行」は Example Server `:4173`、「編集」は Editor の既存 workspace ルート `:8080/?folder=/home/coder/project` を指す（[#255](https://github.com/gurezo/chirimen-raspi-docker/issues/255)）。Device Dashboard は iframe せず外部リンクにする（[#254](https://github.com/gurezo/chirimen-raspi-docker/issues/254)）。

| 項目 | 値 |
| --- | --- |
| Service | `chirimen-example-catalog` |
| Dockerfile | [`docker/example-catalog/Dockerfile`](../../docker/example-catalog/Dockerfile) |
| Image | `chirimen-raspi-docker/example-catalog:phase8` |
| Port | 既定 `${CHIRIMEN_PUBLISH_BIND:-127.0.0.1}:4200:4200`。LAN は Editor と同じ変数 / `--lan`（[#181](https://github.com/gurezo/chirimen-raspi-docker/issues/181)） |
| 配信 | Vite production build を nginx（`nginx:1.30.4-alpine`）で静的配信 |
| Health | `GET /`（HTTP 200） |
| Network | Compose default。`depends_on` なし。`security_opt: no-new-privileges:true` |
| GPIO / I2C | 渡さない |

host の `pnpm nx serve example-catalog` も port `4200` を使う。同時には使わない。Compose catalog を止めてから host で serve する。

### 起動と health check

Runtime（beginner。Pi 3 / 4 / 5 共通）:

```sh
docker compose up -d
curl http://127.0.0.1:33330/health
curl -fsS http://127.0.0.1:8080/healthz
curl -fsS http://127.0.0.1:4173/led-blink/
curl -fsS http://127.0.0.1:4200/
```

HTTP の確認 URL は Raspberry Pi 上、または SSH port forward 先の `127.0.0.1` である。

Development / 上級者（device mapping・LAN・build。Pi 4 / Pi 5 の例。既定で `--build`。Pi 3 B+ は `--no-build`）:

```sh
./scripts/start.sh
# ./scripts/start.sh --no-build  # Pi 3 B+ Runtime-only
./scripts/start.sh --lan         # Editor / Example / Catalog を LAN 公開（Runtime 33330 は変えない）
```

起動後の Example 確認先は `http://127.0.0.1:4173/led-blink/` など（Compose `chirimen-examples` が起動済み。Run Task **Serve examples** は URL 案内）。Example Catalog は `http://127.0.0.1:4200/`（Run Task **Open Example Catalog**。ported の「実行」/「編集」は [#255](https://github.com/gurezo/chirimen-raspi-docker/issues/255)）。Runtime 確認は [Runtime Diagnostics](../guides/runtime-diagnostics.md)。手順は [browser-editor.md の Example 編集 / 静的 serve](./browser-editor.md#example-編集--静的-serve179)。

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
docker compose restart chirimen-example-catalog
curl -fsS http://127.0.0.1:4200/
docker compose restart chirimen-examples
curl -fsS http://127.0.0.1:4173/led-blink/
```

## Editor image（単独起動）

通常の入口は Runtime の `docker compose up -d`、または Development の `./scripts/start.sh`。本節は image 単独の build / `docker run`（[#174](https://github.com/gurezo/chirimen-raspi-docker/issues/174)）。選定の正本は [browser-editor.md](./browser-editor.md)。

Editor は Hardware Runtime ではない。`/dev/gpio*` / `/dev/i2c-1` / `/sys/class/gpio` は渡さない。

| 項目 | 値 |
| --- | --- |
| Dockerfile | [`docker/editor/Dockerfile`](../../docker/editor/Dockerfile) |
| Base | `codercom/code-server:4.132.0`（`latest` 禁止） |
| Image | `chirimen-raspi-docker/editor:4.132.0` |
| Port | `8080`（Editor）。`4173`（Example 静的サーバ。[#179](https://github.com/gurezo/chirimen-raspi-docker/issues/179)） |
| User | `coder`（UID 1000。root ではない）。実行時は `-u "$(id -u):$(id -g)"` と `DOCKER_USER`（`fixuid`） |
| Architecture | `linux/amd64`, `linux/arm64`。`arm32` / `armv7` は非対応 |
| Workspace | `/home/coder/project` |
| Extensions / user-data | `/home/coder/.local` |
| Config | `/home/coder/.config` |
| Health | `GET /healthz`（認証不要。HTTP 200 なら healthy。JSON の `expired` もプロセス生存） |
| Extra packages | `python3-minimal` のみ（[#179](https://github.com/gurezo/chirimen-raspi-docker/issues/179)。Compose では `chirimen-examples` が配信。`docker run` 時の任意手段）。GPIO / I2C ツールと Node は入れない。Extension のプリインストール・推奨もしない（[#201](https://github.com/gurezo/chirimen-raspi-docker/issues/201)） |

### build

build context は `docker/editor`（リポジトリ全体は COPY しない）。

**on-device / 実機での Docker build は Raspberry Pi 4 / Pi 5 を対象とする。** Raspberry Pi 3 B+ は **Runtime-only** であり、`docker build` / `compose build` / `up --build` は Unsupported である。正本は [Compatibility の Development / Docker Build Support](./compatibility.md#development--docker-build-support)。根拠は [#283](https://github.com/gurezo/chirimen-raspi-docker/issues/283) および [検証コメント](https://github.com/gurezo/chirimen-raspi-docker/issues/283#issuecomment-5762812796)。開発手順の機種案内は [Development](../guides/development.md) を参照する。

```sh
docker build -f docker/editor/Dockerfile -t chirimen-raspi-docker/editor:4.132.0 docker/editor
```

`linux/arm64` を明示する場合（クロスビルドやアーキテクチャ指定。実機 on-device build の対象機種とは別）:

```sh
docker buildx build --platform linux/arm64 \
  -f docker/editor/Dockerfile -t chirimen-raspi-docker/editor:4.132.0 --load docker/editor
```

実機起動を `Supported` とは書かない。Pi 3 / 4 / 5 での Editor 検証は [#182](https://github.com/gurezo/chirimen-raspi-docker/issues/182)（Runtime 起動の検証であり、Pi 3 B+ 上の Docker build を Supported とはしない）。

### start（`docker run`。Compose を使わない場合）

検証時の bind は既定 `127.0.0.1`。LAN は `-p 0.0.0.0:8080:8080` など（Compose なら `--lan`）。認証は image の `--auth password`。uid は公式どおり host の `id -u` / `id -g` と `DOCKER_USER`（[#176](https://github.com/gurezo/chirimen-raspi-docker/issues/176)）。

```sh
docker run --rm --name chirimen-editor \
  -p 127.0.0.1:8080:8080 -p 127.0.0.1:4173:4173 \
  -u "$(id -u):$(id -g)" \
  -e "DOCKER_USER=$(id -un)" \
  -v "$PWD/workspace:/home/coder/project" \
  -v chirimen-editor-local:/home/coder/.local \
  -v chirimen-editor-config:/home/coder/.config \
  chirimen-raspi-docker/editor:4.132.0
```

`--device` や `/sys/class/gpio` は付けない。

Browser で `http://127.0.0.1:8080` を開く。通常手順の password は初回 `./scripts/start.sh` で `.env` に決めた値である（#269）。image 単独の `docker run` では `config.yaml` に生成される。これは通常手順ではない。

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

stage 構成は 64-bit を正とする。supported Dockerfile は [`docker/server/Dockerfile`](../../docker/server/Dockerfile) のみ。かつて存在した 32-bit 用 `Dockerfile.32bit`（Node 22 / `linux/arm/v7`）は [#339](https://github.com/gurezo/chirimen-raspi-docker/issues/339) で削除済み。背景は [Historical: 32-bit Compatibility](./compatibility-32bit.md)。

| OS | ファイル | ベース | 備考 |
| --- | --- | --- | --- |
| 64-bit（`aarch64` / `x86_64` など） | [`docker/server/Dockerfile`](../../docker/server/Dockerfile) | `node:24-bookworm-slim` | サポート対象。`compose.yaml` の default |
| 32-bit（`armv7l` など） | （削除済み）`Dockerfile.32bit` | 当時 `node:22-bookworm-slim` | Unsupported。Historical のみ |

`./scripts/start.sh` のサポート対象は 64-bit OS である。`docker compose up --build` を直接使うと 64-bit 用 `Dockerfile` になる。`--build` / `compose build` / `docker build` の on-device 実行は **Raspberry Pi 4 / Pi 5** 向けであり、**Raspberry Pi 3 B+ は Runtime-only**（`up` / `down` のみ。詳細は [Compatibility](./compatibility.md#development--docker-build-support)）。かつて存在した `./scripts/start.sh --32bit`（Runtime only）は [#340](https://github.com/gurezo/chirimen-raspi-docker/issues/340) で削除済み。背景は [Historical: 32-bit Compatibility](./compatibility-32bit.md)。

| Stage | 役割 |
| --- | --- |
| `base` | 上記の Node slim image、corepack で pnpm を有効化 |
| `deps` | native addon 用に `python3` / `make` / `g++` を入れ、`npm_config_nodedir=/usr/local` で lockfile から依存を install |
| `build` | `pnpm nx build server`（当時の 32-bit path は削除済みの `node scripts/build-server.mjs`。背景は [32-bit Compatibility](./compatibility-32bit.md)） |
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

推奨環境と実機検証の正本は [Compatibility](./compatibility.md) である。サポート対象は Raspberry Pi 3 B+ / 4 / 5 の Raspberry Pi OS 64-bit。標準環境は Raspberry Pi OS 64-bit Desktop（Lite も可）。Browser Development Flow の一連は [#243](https://github.com/gurezo/chirimen-raspi-docker/issues/243)。

## 非 Pi 環境での制限

任意 device が無くても `./scripts/start.sh` は起動を試みる（GPIO / I2C は unavailable）。`/sys/class/gpio` が host に無い場合は volume bind の挙動が環境依存のため、GPIO 検証は Raspberry Pi 上で行う。

代替:

- `pnpm install` のうえ `npx nx build server` / `npx nx serve server` で TypeScript / server 開発を続ける

障害の切り分けは [troubleshooting.md](../guides/troubleshooting.md) を参照。

## 未実装（将来）

Wiki で想定している次は、現状未実装。

| 要素 | 予定役割 |
| --- | --- |
| `docker/nginx` | reverse proxy / TLS 終端。Catalog 静的配信は [`docker/example-catalog`](../../docker/example-catalog/Dockerfile)（[#254](https://github.com/gurezo/chirimen-raspi-docker/issues/254) / [#263](https://github.com/gurezo/chirimen-raspi-docker/issues/263)） |

Editor Compose service は [`compose.yaml`](../../compose.yaml) の `chirimen-editor`（[#175](https://github.com/gurezo/chirimen-raspi-docker/issues/175)）。永続化は [#176](https://github.com/gurezo/chirimen-raspi-docker/issues/176)。#177 の optional profile は [#208](https://github.com/gurezo/chirimen-raspi-docker/issues/208) で既定の全サーバー起動へ戻した（`docker compose up` / `./scripts/start.sh`）。Example 静的 serve は [#179](https://github.com/gurezo/chirimen-raspi-docker/issues/179)（Compose `chirimen-examples`、既定 `127.0.0.1:4173`）。Example Catalog は [#254](https://github.com/gurezo/chirimen-raspi-docker/issues/254) / [#263](https://github.com/gurezo/chirimen-raspi-docker/issues/263)（既定 `127.0.0.1:4200`）。Security（bind / 認証 / LAN）は [#181](https://github.com/gurezo/chirimen-raspi-docker/issues/181)。
