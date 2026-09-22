# Troubleshooting

CHIRIMEN Runtime のセットアップ・起動でよくある障害と対処。まず **Raspberry Pi Setup（Host）の問題**か **CHIRIMEN Setup / Runtime の問題**かを切り分ける。

関連:

- [Getting Started](./getting-started.md)（setup.sh → compose up → Catalog。Runtime 起動は Step 2）
- [Runtime Diagnostics](./runtime-diagnostics.md)（doctor.sh / `/health` / Reference Examples）
- [Browser Development Environment](./browser-development.md)
- [Raspberry Pi Setup](./raspberry-pi-setup.md)（Host 構築。`setups/`）
- 実機 E2E: [Compatibility の Browser Development Flow 実機検証](../architecture/compatibility.md#browser-development-flow-実機検証243)（[#243](https://github.com/gurezo/chirimen-raspi-docker/issues/243)）
- [GPIO LED Blink](./gpio-led-blink.md)
- [GPIO Input](./gpio-input.md)
- [I2C Scan](./i2c-scan.md)
- [I2C Scan 検証仕様](../examples/i2c-scan.md)
- [Docker 構成](../architecture/docker.md)
- [Browser Editor](../architecture/browser-editor.md)

## Host と Runtime の切り分け

| 症状の目安 | 見る場所 |
| --- | --- |
| swap / I2C 無効 / Docker 未導入 / `/dev/i2c-1` が host に無い | [Raspberry Pi Setup](./raspberry-pi-setup.md)（`setups/`） |
| Host は揃っているが起動前に怪しい | `./scripts/doctor.sh`（設定は変えない。[Getting Started の Step 2](./getting-started.md#step-2-start-runtime)） |
| 起動しない / health が返らない | `docker compose up -d` と [Runtime Diagnostics](./runtime-diagnostics.md)。device mapping が必要なときだけ `./scripts/start.sh` |
| LED / I2C Example が動かない | [GPIO LED Blink](./gpio-led-blink.md) / [GPIO Input](./gpio-input.md) / [I2C Scan](./i2c-scan.md) |

`doctor.sh` で `[error]` が出たら Host 側の不足である。Runtime を触る前に Raspberry Pi Setup へ戻る。

## Browser Development の切り分け

`Learn → Edit → Save → Run → Verify` で詰まったときの入口。詳細は各節へ。Catalog（`:4200`）は題材の発見入口であり、編集結果の確認先ではない。Runtime の切り分けは [Runtime Diagnostics](./runtime-diagnostics.md)。

| 症状 | 参照 |
| --- | --- |
| 8080 が開かない | [Editor（8080）が開かない](#editor8080が開かない) |
| 4173 が開かない | [Example の静的サーバ（4173）が開かない](#example-の静的サーバ4173が開かない) |
| 4200 が開かない | [Example Catalog（4200）が開かない](#example-catalog4200が開かない) |
| 保存できない | [Editor で Example が保存できない](#editor-で-example-が保存できないpermission-denied) |
| 保存後未反映 | [Example を保存しても Browser に反映されない](#example-を保存しても-browser-に反映されない) |
| Runtime 接続不可 | [LAN から Example は開くが GPIO / I2C が動かない](#lan-から-example-は開くが-gpio-i2c-が動かない) / [Example は開くが GPIO / I2C が動かない](#example-は開くが-gpio-i2c-が動かない) |
| GPIO / I2C が動かない | [device が無く GPIO / I2C が unavailable になる](#device-が無く-gpio-i2c-が-unavailable-になる) と上記の Runtime 接続 |
| 実機 E2E の記録を見る | [Compatibility の Browser Development Flow 実機検証](../architecture/compatibility.md#browser-development-flow-実機検証243)（#243）。手順は [browser-development.md](./browser-development.md#実機-e2e-検証243) |
| スクリーンキーボードが入力を妨げる | [Desktop でスクリーンキーボードが出る](#desktop-でスクリーンキーボードが出る) |
| Pi 3 B+ でメモリ不足 / Editor が重い | [Pi 3 B+ で Editor が重い / メモリ不足](#pi-3-b-で-editor-が重い--メモリ不足) |
| Pi 3 B+ で on-device Docker build | [Pi 3 B+ の on-device Docker build は Unsupported](#pi-3-b-の-on-device-docker-build-は-unsupported) |
| Pi 4 / Pi 5 でビルドが OOM / 熱 | [Pi 4 / Pi 5 で Docker ビルドが OOM / killed](#pi-4--pi-5-で-docker-ビルドが-oom-killed) |

## device が無く GPIO / I2C が unavailable になる

### 症状

- doctor / server が `gpio=unavailable` や `i2c=unavailable` を出す
- container 内に期待した `/dev/*` が無い
- （旧手順で）固定 `devices` を並べた `docker compose up` が欠如 path で失敗する

### 確認

```sh
./scripts/doctor.sh
ls -l /sys/class/gpio /dev/gpiomem* /dev/gpiochip* /dev/i2c-1
./scripts/start.sh --help
```

起動時の `mapping:` 行で、実際に渡した path を確認する。

### 対処

| 原因 | 対処 |
| --- | --- |
| I2C 未有効 | [Raspberry Pi Setup](./raspberry-pi-setup.md) の I2C 手順（`setups/enable-i2c.sh` → reboot → `--check`） |
| GPIO sysfs 不足 | host で `/sys/class/gpio` を確認。無い場合は gpiochip のみになることがある（現状 unsupported） |
| device mapping が無い | Runtime はまず `docker compose up -d`。GPIO / I2C device を capability-aware に渡すときは `./scripts/start.sh`（Pi 3 B+ は `--no-build`） |
| 非 Pi 環境 | 下記「非 Pi 環境」を参照 |

`compose.yaml` に任意 device を固定列挙しない。必要なときは `scripts/start.sh` が capability-aware に追加する。

## I2C が使えない / scan が空

### 症状

- doctor で `[error] I2C: unavailable` / `i2c=unavailable`
- container 内に `/dev/i2c-1` が無い
- `requestNodeI2CAccess()` が失敗し、Runtime 上で I2C が unavailable

### 対処

1. host で I2C を有効化して reboot する（[Raspberry Pi Setup](./raspberry-pi-setup.md)）
2. `./setups/enable-i2c.sh --check`（sudo 不要。[#216](https://github.com/gurezo/chirimen-raspi-docker/issues/216)）
3. `docker compose up -d`（または device mapping が必要なら `./scripts/start.sh`。Pi 3 B+ は `--no-build`）し直し、`docker compose exec chirimen-runtime ls -l /dev/i2c-1`

Pi 5 での I2C → Docker → Runtime 確認は [#219](https://github.com/gurezo/chirimen-raspi-docker/issues/219)。

slave が接続されていない場合、scan 結果が空になるのは正常なことがある。配線とアドレスを確認する。検証用 slave は ADT7410（expected `0x48`）。操作手順は [I2C Scan](./i2c-scan.md)。配線は [検証仕様](../examples/i2c-scan.md)。

## Permission denied（GPIO / I2C）

### 症状

`export` / `write` / I2C `open` などで Permission denied。

### 確認

```sh
ls -l /dev/gpiomem* /dev/i2c-1 /sys/class/gpio
getent group gpio
getent group i2c
docker compose exec chirimen-runtime ls -l /sys/class/gpio
docker compose exec chirimen-runtime ls -l /dev/gpiomem* /dev/i2c-1 2>/dev/null || true
```

### 対処

- 現行 image は root 起動のため、まずは host 側に device / sysfs が存在し、`start.sh` の mapping が効いているかを確認する
- mount 漏れなら [docker.md](../architecture/docker.md) の devices / volumes を見直す
- 将来 non-root 化する場合は、host の `gpio` / `i2c` グループ GID を `group_add` で合わせる

## GPIO export で EROFS（read-only file system）

### 症状

container 内で `node-web-gpio` の `export` が次で失敗する。

```text
OperationError: Error: EROFS: read-only file system, open '/sys/class/gpio/gpioN/direction'
```

host 上の `/sys/class/gpio` への書き込みは成功することがある。

### 原因

container の `/sys` は通常 read-only。`/sys/class/gpio` だけを bind すると `export` は通るが、作られる `gpioN` は `/sys/devices/...` への symlink のため、`direction` / `value` 書き込みが read-only な `/sys` に当たる。

### 確認

```sh
docker compose exec chirimen-runtime sh -c 'mount | grep -E "sys|gpio"; ls -l /sys/class/gpio/gpio* 2>/dev/null | head'
```

`/sys` が `ro` で `/sys/class/gpio` だけが `rw`、かつ `gpioN` が `../../devices/...` を指していればこの症状。

### 対処

`compose.yaml` で `/sys/class/gpio` に加え `/sys/devices` も mount する（現行 main）。再作成後に再試行する。

```sh
./scripts/start.sh --force-recreate
```

## health は OK だが I2C が unavailable

### 症状

`curl http://127.0.0.1:33330/health` は成功するが、I2C 操作ができない。

### 説明

server プロセス自体は起動し続ける。I2C device 欠如時は `requestNodeI2CAccess()` が失敗し、`NodeRuntimeContext.i2c.available` が `false` になる（GPIO と同様、device が無いと該当機能だけ使えない）。

### 対処

host で `/dev/i2c-1` を用意してから `./scripts/start.sh` で container を再作成する。

## Pi 5 で GPIO が不明 / gpiochip unsupported

### 症状

- doctor が `gpio=gpiochip` と `[warn]`（unsupported）を出す
- または doctor / server が `gpio=unavailable` になる
- GPIO 初期化に失敗する

### 確認

```sh
./scripts/doctor.sh
ls -l /sys/class/gpio /dev/gpiomem* /dev/gpiochip*
```

doctor の `[ capabilities ]` 行は server startup log と同じ backend 名になる。

### 対処

- `/sys/class/gpio` があれば Runtime は `sysfs` backend を使う（現行の実装経路）
- sysfs が無く `/dev/gpiochip*` のみの場合、現状は backend 未実装のため GPIO は利用できない（doctor / server とも unsupported と表示）
- `./scripts/start.sh` は存在する `gpiochip*` を container に渡す（detection 揃え用）。backend 実装は別 Issue

### 実機メモ（#97 / #98 / #99）

- **Pi 3 B+（#97）**: Raspbian OS 64-bit（`aarch64` / `6.18.34+rpt-rpi-v8`）で `/sys/class/gpio` が存在し `gpio=sysfs` / `i2c=i2c-dev` を確認済み。初期状態で `/dev/i2c-1` が無い場合は `setups/enable-i2c.sh` 等で有効化する。A+ はスペック不足のため推奨環境外
- **Pi 4（#98）**: Raspbian OS 64-bit（`aarch64` / `6.18.34+rpt-rpi-v8`）で `/sys/class/gpio` が存在し `gpio=sysfs` / `i2c=i2c-dev` を確認済み。初期状態で `/dev/i2c-1` が無い場合は `setups/enable-i2c.sh` 等で有効化する
- **Pi 5（#99）**: Model B Rev 1.0 では `/sys/class/gpio` が存在し `gpio=sysfs` で動作確認済み（kernel `2712`）。gpiochip 専用 backend は不要。container 内で `EROFS` になる場合は上記「GPIO export で EROFS」を参照（`/sys/devices` mount）。I2C Host Setup → Docker Runtime は [#219](https://github.com/gurezo/chirimen-raspi-docker/issues/219)。Browser Development Flow（Editor → Workspace → Example Server → Runtime）は [#243](https://github.com/gurezo/chirimen-raspi-docker/issues/243)

## 32-bit OS は Unsupported

> 32-bit OS は Unsupported です。[Historical: 32-bit Compatibility](../architecture/compatibility-32bit.md)

次のようなエラーは 32-bit OS で起きうる。対処は旧 `--32bit` flag（削除済み）ではなく、**Raspberry Pi OS 64-bit Desktop**（Lite も可）への移行である。host を 64-bit に切り替えてから [Getting Started](./getting-started.md) を使う。過去の検証背景は Historical を参照する。

```text
failed to resolve source metadata for docker.io/library/node:24-bookworm-slim:
no match for platform in manifest: not found
```

```text
NX   Nx Daemon was not able to compute the project graph.
NX   hashArray is not a function
```

## Pi 3 B+ の on-device Docker build は Unsupported

### 症状

- Pi 3 B+ 上で `docker compose build` / `up --build` / image build を試す
- ビルド中に OOM / killed / 熱暴走 / ハングする

### 原因

Raspberry Pi 3 B+ の on-device Docker build は **Unsupported** である。Pi 3 B+ は Runtime-only（`docker compose up` / `down`）。build 不可は swap の有無とは別のサポートポリシーである。`swap.sh` を積んでも Pi 3 B+ build は Supported にならない。

機種別の Supported / Unsupported は [Compatibility](../architecture/compatibility.md)。実機検証の経緯は [#283](https://github.com/gurezo/chirimen-raspi-docker/issues/283)。

### 対処

- Runtime 利用: [Getting Started](./getting-started.md) の Pi 3 B+ Runtime-only 導線（`--no-build` 等）
- Source Development / Docker build: **Raspberry Pi 4 / Pi 5** で行う（[Development](./development.md)）
- Pi 4 / Pi 5 での build OOM は次節

## Pi 4 / Pi 5 で Docker ビルドが OOM / killed

### 症状

- Pi 4 / Pi 5 上で `./scripts/start.sh` や `docker compose up --build` が途中で killed になる
- `dmesg` に Out of memory が出る
- container 内の `pnpm install` / `pnpm nx build` が落ちる
- ビルド中にホストが極端に遅くなる / 熱 throttle する

### 原因

Docker image ビルドはメモリ・CPU 負荷が高い。Pi 4 / Pi 5 でも OOM や熱 throttle が起きうる。ルートに約 8GB の空きが無いと `/swapfile` を作れない。

### 対処

```sh
df -h /
sudo ./setups/swap.sh
sudo ./setups/swap.sh --check
free -h
```

`swap.sh` の主用途は Pi 4 / Pi 5 の Source Development / Docker build である。`/swapfile` だけを扱い、OS 既定 Swap（`dphys-swapfile` / `/var/swap` / zram）は消さない。16GB microSD では OS + Docker image + 8GB swap で逼迫しうる。手順は [Raspberry Pi Setup](./raspberry-pi-setup.md) と [setups/README.md](../../setups/README.md)。

高負荷ビルド時は CPU ファンの装着も推奨する（任意。特定型番は指定しない）。build 対象機種は [Compatibility](../architecture/compatibility.md) / [Development](./development.md)。

## Pi 3 B+ で Editor が重い / メモリ不足

### 症状

- Runtime / Catalog / Example Server は動くが、ホストが極端に遅い
- `chirimen-editor` が Exited する。`dmesg` に OOM
- `curl -fsS http://127.0.0.1:8080/healthz` が Failed to connect。`:4200` と `:33330` は応答する

### 原因

Pi 3 B+ の基本体験に **code-server（Browser Editor `:8080`）は含めない。** Catalog `:4200` と Example Server `:4173` で GPIO LED Blink / I2C Scan は成立する。既定の `./scripts/start.sh` は Editor も起動する。1GB RAM では Editor が OOM の原因になりうる。

### 対処

基本体験だけ続けるときは Editor を止める。

```sh
docker compose stop chirimen-editor
```

Compose を直接使う場合:

```sh
docker compose up chirimen-runtime chirimen-examples chirimen-example-catalog
```

8080 が開かない他の原因（`fixuid` / `no-new-privileges`）は [Editor（8080）が開かない](#editor8080が開かない)。低メモリ時の任意の Swap は [Raspberry Pi Setup の swap.sh](./raspberry-pi-setup.md#development-only-swapsh)（Runtime-only では必須ではない。Pi 3 B+ build の回避策ではない）。

## Docker build が `i2c-bus` / `node-gyp` で失敗する

### 症状

**Raspberry Pi 4 / Pi 5** 上で `./scripts/start.sh` や `docker compose up --build` で次のようなエラーになる（Pi 3 B+ の on-device Docker build は Unsupported。こちらには来ない）。

```text
.../i2c-bus@... install$ node-gyp rebuild
gyp ERR! find Python
Could not find any Python installation to use
```

または headers 取得時の DNS 失敗:

```text
gyp http GET https://nodejs.org/download/release/v22.23.2/node-v22.23.2-headers.tar.gz
gyp ERR! stack Error: getaddrinfo EAI_AGAIN nodejs.org
```

### 原因

`node-web-i2c` が依存する `i2c-bus` は install 時に native rebuild する。`node:bookworm-slim` だけでは Python / コンパイラが無い。加えて pnpm は `nodedir` を渡さないため、node-gyp が `nodejs.org` から Node headers をダウンロードしようとする。Pi 上の Docker DNS ではこの lookup が `EAI_AGAIN` で失敗しやすい。

### 対処

[`docker/server/Dockerfile`](../../docker/server/Dockerfile) の `deps` ステージに `python3` / `make` / `g++` と `npm_config_nodedir=/usr/local` が入っていること（現行 main）を確認し、**Pi 4 / Pi 5** で再ビルドする。

```sh
./scripts/start.sh --build --force-recreate
```

`runtime` ステージは slim の `base` から作るため、最終 image に build tools は残らない。詳細は [Docker 構成](../architecture/docker.md)。Pi 3 B+ の on-device Docker build は Unsupported（[Pi 3 B+ の on-device Docker build は Unsupported](#pi-3-b-の-on-device-docker-build-は-unsupported)）。

## Editor で Example が保存できない（Permission denied）

### 症状

Browser Editor から `workspace/` 配下を保存すると Permission denied になる。または host 側のファイル所有者が `coder` / UID 1000 になり、host ユーザーで書けない。

### 確認

```sh
ls -ld workspace
id -u
id -g
docker compose exec chirimen-editor id
```

起動ログの `editor uid=` が host の `id -u`:`id -g` と一致するか見る。

### 対処

- Browser Editor で host uid を渡すときは `./scripts/start.sh`（Development / 上級者向け）
- `docker compose up -d` を直接使う場合は `CHIRIMEN_EDITOR_UID` / `CHIRIMEN_EDITOR_GID` / `CHIRIMEN_EDITOR_USER` を host に合わせる
- root では起動しない
- GPIO / I2C の Permission denied はこの節ではなく上記「Permission denied（GPIO / I2C）」

方針は [browser-editor.md の uid / gid](../architecture/browser-editor.md#uid--gid)。

## Editor にログインできない / password を忘れた

### 症状

Browser で `http://127.0.0.1:8080` を開いても、セットアップで決めたと思っている password で入れない。

### 原因

- 初回の対話 `./scripts/start.sh` で決めた値と違う文字列を入力している
- `.env` の `CHIRIMEN_EDITOR_PASSWORD` を後から変えたが、container が古い設定のまま
- 非対話起動（CI / TTY なし）で `.env` が空のまま、named volume の `config.yaml` にランダム生成された
- `docker compose down -v` で volume 上の `config.yaml` が消えた

### 確認

通常は `.env` を開いて `CHIRIMEN_EDITOR_PASSWORD` があることだけ確認する。値をチャットやログに貼らない。

非対話で生成した場合、または `.env` が空の場合だけ `config.yaml` を読む。

```sh
docker compose exec chirimen-editor cat /home/coder/.config/code-server/config.yaml
```

### 対処

覚えられる password に直すときは host の `.env`（gitignored）に `CHIRIMEN_EDITOR_PASSWORD` を置き、`./scripts/start.sh` で起動する。compose.yaml に `PASSWORD=` は書かない。`.env` は Git に含めない。`auth: none` は使わない。

## Editor の password / 設定が消えた

### 症状

container 再作成後に Editor の password が変わり、入れていた extension も無い。Example の編集内容は残っている。

### 原因

`docker compose down -v` または `docker volume rm` が named volume `chirimen-editor-config` / `chirimen-editor-local` を消した。workspace は bind mount のため残る。

### 確認

```sh
docker volume ls | grep chirimen-editor
docker compose exec chirimen-editor cat /home/coder/.config/code-server/config.yaml
```

### 対処

設定を残すときは `docker compose down`（**`-v` なし**）で container だけ削除する。消してしまった password は、対話の `./scripts/start.sh` で覚えられる値を `.env` に書き直すか、新しい `config.yaml` を読み直す。compose.yaml に `PASSWORD=` は書かない。Example の中身は host の `workspace/` を見る。ユーザーが任意に導入した Extension は named volume `chirimen-editor-local` が消えると無くなる。再インストールはユーザー判断である。

## LAN から Editor / Catalog に届かない

### 症状

別マシンの Browser で `http://<Pi の IP>:8080` や `:4200` に接続できない。Pi 上の `http://127.0.0.1:8080` は開く。

### 原因

既定の host bind は `127.0.0.1` である。Internet にも LAN にも出さない。`--lan` なし、または `CHIRIMEN_PUBLISH_BIND` が `127.0.0.1` のまま。

### 確認

```sh
./scripts/start.sh --help
docker compose port chirimen-editor 8080
```

起動ログの `publish:` が `127.0.0.1` か `0.0.0.0 (LAN)` かを見る。

### 対処

- LAN が必要なら `./scripts/start.sh --lan`（または `CHIRIMEN_PUBLISH_BIND=0.0.0.0`）
- 旧 `--32bit` flag（削除済み）は Editor 系を起動しなかった。現行は 64-bit の全サーバー起動のみ。詳細は [Historical: 32-bit Compatibility](../architecture/compatibility-32bit.md)
- Internet へは出さない。reverse proxy は本リポジトリでは提供しない

方針は [browser-editor.md の Publish / bind](../architecture/browser-editor.md#publish--bind181)。

## LAN から Example は開くが GPIO / I2C が動かない

### 症状

別マシンで `http://<Pi の IP>:4173/led-blink/` や Catalog `:4200` は表示されるが、GPIO / I2C 操作が失敗する。

### 原因

HTML Example の既定 WebSocket 先は `ws://localhost:33330/` で、別マシンの localhost を指す。Runtime は `--lan` しても bind を変えない（もともと全 interface）。

### 対処

- HTML Example は script の前に `CHIRIMEN_WS_URL` を Pi の IP へ向ける（[browser-polyfill.md](./browser-polyfill.md)）
- `curl http://<Pi の IP>:33330/health` で Runtime を確認する
- Editor / Catalog container に GPIO / I2C device は渡していない

## Desktop でスクリーンキーボードが出る

### 症状

Raspberry Pi OS Desktop で Browser Editor（`:8080`）や Catalog のテキスト欄にフォーカスすると、スクリーンキーボード（Squeekboard）が重なり、物理キーボードの操作を妨げる。

### 原因

Bookworm 以降の Desktop（Wayland）は Squeekboard を出すことがある。推奨 OS の Lite にはスクリーンキーボードが無い。

### 対処

Lite の必須手順ではない。Desktop を使う場合の任意手順である。

```sh
sudo ./setups/disable-squeekboard.sh
./setups/disable-squeekboard.sh --check   # sudo 不要
```

残る場合は再ログインまたは reboot。手動は Control Centre → Display → On-screen keyboard → Disabled、または `raspi-config` → Display Options → D6 → S3 Always Off。手順の正本は [Raspberry Pi Setup](./raspberry-pi-setup.md#3-disable-squeekboardsh)。

## Editor を IP 直打ち HTTP で開くと webview が壊れる

### 症状

LAN の `http://192.168.x.x:8080` で Editor は開くが、webview / Service Worker が失敗する。Browser コンソールに secure context のエラーが出る。

### 原因

code-server の webview は secure context を要求する。`localhost` は常に secure。IP アドレスの HTTP は insecure になりうる。

### 対処

- 既定どおり Pi 上または SSH port forward の `http://127.0.0.1:8080` を使う
- Internet 公開が必要ならドメイン + HTTPS の reverse proxy を別途用意する。`docker/nginx` は未実装
- 本リポジトリの既定は HTTP + password + `127.0.0.1`

方針は [browser-editor.md の HTTPS](../architecture/browser-editor.md#https--reverse-proxy)。

## Editor で Microsoft Marketplace の拡張が入れられない

### 症状

GitHub Copilot など、Desktop VS Code で使っていた拡張が gallery に無い。Marketplace の URL から入れようとしても失敗する。

### 原因

code-server は Microsoft Marketplace に接続しない。既定は Open VSX である。プロジェクトは特定 Extension を必須・推奨しない。

### 対処

- プロジェクトは特定 Extension を必須・推奨しない。入れたい Extension はユーザーが任意に選ぶ
- Copilot 等は使えない前提にする。GPIO / I2C 操作は Editor 拡張ではなく Browser Polyfill 経路
- `.vsix` はリポジトリに置かない

方針は [browser-editor.md の Marketplace 制約](../architecture/browser-editor.md#marketplace-制約)。

## Example の lint は Editor では動かない

### 症状

Editor workspace の `workspace/` で lint が出ない。または eslint が見つからないと出る。

### 原因

Editor workspace は `workspace/` のみで、`eslint` / `node_modules` が無い。monorepo の `pnpm lint` は host 向けである。プロジェクトは ESLint Extension を必須・推奨しない。

### 対処

- monorepo の TypeScript lint は host で `pnpm lint`（[Development Guide](./development.md)）
- Editor workspace へ Nx は入れない（[#180](https://github.com/gurezo/chirimen-raspi-docker/issues/180) で再評価済み）

方針は [browser-editor.md の Extensions](../architecture/browser-editor.md#extensions)。

## Editor（8080）が開かない

### 症状

`./scripts/start.sh` のあと `curl -fsS http://127.0.0.1:8080/healthz` が Failed to connect になる。`http://127.0.0.1:4200/` と `http://127.0.0.1:33330/health` は応答する。

### 原因

`chirimen-editor` が code-server を起動せずに終了している。公式 entrypoint は先頭で `fixuid`（setuid）を実行する。`security_opt: no-new-privileges:true` があると setuid が効かず、8080 は listen しない。Catalog と Runtime は `fixuid` を使わないため生き残る。メモリ不足で kill された場合も同じ症状になる。

### 確認

```sh
docker compose ps -a
docker compose logs chirimen-editor
```

`fixuid` / `NoNewPrivileges` のエラー、または container が `Exited` ならこの原因。`dmesg` に OOM があればメモリ不足。[Pi 3 B+ で Editor が重い / メモリ不足](#pi-3-b-で-editor-が重い--メモリ不足) を先に見る。

### 対処

- `compose.yaml` の `chirimen-editor` に `no-new-privileges` が無いことを確認する
- container を再作成する: `./scripts/start.sh --force-recreate`
- Pi 3 B+ で基本体験だけ続けるときは `docker compose stop chirimen-editor`（Editor は必須ではない）
- 再確認: `curl -fsS http://127.0.0.1:8080/healthz`（HTTP 200。JSON の `expired` もプロセス生存）

方針は [browser-editor.md の Publish / bind](../architecture/browser-editor.md#publish--bind181)。

## Example の静的サーバ（4173）が開かない

### 症状

`http://127.0.0.1:4173/led-blink/` などが接続できない。

### 原因

`chirimen-examples` が起動していない、または image がまだ build されていない。旧 `--32bit` 経路（削除済み）は Runtime only で Examples を起動しなかった（[Historical: 32-bit Compatibility](../architecture/compatibility-32bit.md)）。古い compose では 4173 を Editor が publish するだけで、中で HTTP サーバは動かなかった。

### 対処

- `./scripts/start.sh` で Runtime + Editor + Examples + Catalog を起動する
- `curl -fsS http://127.0.0.1:4173/led-blink/` が HTML を返すことを確認する
- `docker compose ps` で `chirimen-examples` が running か見る
- host から配信する場合は Compose の examples を止めてから `cd workspace && python3 -m http.server 4173`（従来手順）

方針は [browser-editor.md の Example 編集](../architecture/browser-editor.md#example-編集--静的-serve179)。

## Example Catalog（4200）が開かない

### 症状

`http://127.0.0.1:4200/` に接続できない。または host の `pnpm nx serve example-catalog` が port 使用中で失敗する。

### 原因

`chirimen-example-catalog` が起動していない、または Catalog image がまだ build されていない。旧 `--32bit` 経路（削除済み）は Runtime only で Catalog を起動しなかった（[Historical: 32-bit Compatibility](../architecture/compatibility-32bit.md)）。host の Vite と Compose `chirimen-example-catalog` が同じ port `4200` を使っている。

### 対処

- `./scripts/start.sh` で Runtime + Editor + Examples + Catalog を起動する
- `curl -fsS http://127.0.0.1:4200/` が HTML を返すことを確認する
- `docker compose ps` で `chirimen-example-catalog` が running か見る
- host で Vite を使うときは Compose の catalog を止める: `docker compose stop chirimen-example-catalog`。手順は [Development Guide](./development.md)
- Catalog の「実行」は Example Server `:4173`、「編集」は Editor `:8080/?folder=/home/coder/project` を別タブで開く。子ディレクトリを新しい workspace にはしない。legacy に実行 / 編集は出ない

方針は [browser-development.md の Catalog で題材を探す](./browser-development.md#catalog-で題材を探す)。

## Example は開くが GPIO / I2C が動かない

### 症状

`http://127.0.0.1:4173/led-blink/` などは表示されるが、GPIO / I2C 操作が失敗する。Runtime 未接続時はページ上にエラーが出る。

### 原因

WebSocket 先は Browser から `ws://localhost:33330/` である。Catalog / Examples container は静的ファイルだけを配信し、GPIO / I2C には触れない。Runtime が止まっていると Polyfill は接続できない。

### 対処

- `curl http://127.0.0.1:33330/health` で Runtime を確認する（Pi 上、または SSH port forward 先）
- 接続先は `ws://localhost:33330/`（Browser の localhost。[browser-polyfill.md](./browser-polyfill.md)）
- Editor / Catalog container に GPIO / I2C device は渡していない
- 切り分けは [Runtime Diagnostics](./runtime-diagnostics.md)

## Example を保存しても Browser に反映されない

### 症状

Editor で `main.js` を保存したあと、Example の見た目や LED の動きが変わらない。

### 原因

HTML サンプルは静的ファイルである。hot reload は無い。標準操作は `Edit → Save → Browser reload` である。Catalog（`:4200`）は編集結果を表示しない。

保存先は Editor `/home/coder/project` = host `./workspace` である。確認先は Example Server `:4173` である。

### 対処

- Example を開いている Browser タブを reload する
- 開いている URL が `http://127.0.0.1:4173/led-blink/` など、編集中のディレクトリと一致しているか確認する
- `http://127.0.0.1:4200/` を開いていないか確認する（Catalog は編集結果の確認先ではない）
- 保存先が Editor `/home/coder/project`（host `./workspace`）であることを確認する
- `polyfill.js` を変えた場合は host で `pnpm nx bundle browser-polyfill` したあと reload する

## 非 Pi 環境（macOS など）

### 症状

host に `/dev/gpiomem` や `/dev/i2c-1` が無い。GPIO / I2C は使えない。

### 対処（開発継続）

- `./scripts/start.sh` で任意 device なし起動を試みる（GPIO / I2C 検証は不可）
- またはローカルで TypeScript / server 開発する（手順は [Development Guide](./development.md)）:

```sh
pnpm install
npx nx build server
npx nx serve server
```

GPIO / I2C の実機検証は Raspberry Pi 上で行う。

## doctor が exit 1 になる

`[error]` の行を上から解消する。doctor は Host 設定を変えない。典型順:

1. Raspberry Pi / OS / architecture
2. Memory / Swap（SwapTotal=0 は `[warn]`。任意。主用途は Pi 4 / Pi 5 の Docker build）→ `sudo ./setups/swap.sh`
3. Docker Engine → `./setups/docker.sh`。daemon / docker グループは `systemctl start docker` / `usermod`
4. Docker Compose → `./setups/docker-compose.sh`
5. `/dev/i2c-1`（`i2c=unavailable` は error）→ `sudo ./setups/enable-i2c.sh` → reboot → `--check`
6. GPIO は `unavailable` / `gpiochip` unsupported でも `[warn]`（exit 0 可）。必要なら `/sys/class/gpio` と `/dev/gpiochip*` を確認

| 問題 | 戻先 |
| --- | --- |
| Swap problem | `sudo ./setups/swap.sh` |
| I2C unavailable | `sudo ./setups/enable-i2c.sh` |
| Docker unavailable | `./setups/docker.sh` |
| Compose unavailable | `./setups/docker-compose.sh` |

解消後に Getting Started の Step 2 へ戻る: [Getting Started Step 2](./getting-started.md#step-2-start-runtime)。確認項目の正本は [Runtime Diagnostics](./runtime-diagnostics.md)。

## LED が点かない

配線・`polyfill.js` の配置・HTML サンプルの切り分けは [GPIO LED Blink](./gpio-led-blink.md) の Troubleshooting を参照する。

## タクトスイッチを押しても値が変わらない

配線・HTML サンプルの切り分けは [GPIO Input](./gpio-input.md) の Troubleshooting を参照する。

## I2C Scan で address が出ない

配線・I2C 有効化・HTML サンプルの切り分けは [I2C Scan](./i2c-scan.md) の Troubleshooting を参照する。
