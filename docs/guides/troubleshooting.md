# Troubleshooting

CHIRIMEN Runtime のセットアップ・起動でよくある障害と対処。

関連:

- [Getting Started](./getting-started.md)
- [Raspberry Pi setup](./raspberry-pi-setup.md)
- [GPIO LED Blink](./gpio-led-blink.md)
- [GPIO Input](./gpio-input.md)
- [I2C Scan](./i2c-scan.md)
- [I2C Scan 検証仕様](../examples/i2c-scan.md)
- [Docker 構成](../architecture/docker.md)
- [Browser Editor](../architecture/browser-editor.md)

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
| I2C 未有効 | [raspberry-pi-setup.md](./raspberry-pi-setup.md) の I2C 手順（`scripts/enable-i2c.sh` → reboot → `--check`） |
| GPIO sysfs 不足 | host で `/sys/class/gpio` を確認。無い場合は gpiochip のみになることがある（現状 unsupported） |
| 推奨入口を使っていない | `./scripts/start.sh` を使う（存在する device だけを渡す） |
| 非 Pi 環境 | 下記「非 Pi 環境」を参照 |

`compose.yaml` に任意 device を固定列挙しない。`scripts/start.sh` が capability-aware に追加する。

## I2C が使えない / scan が空

### 症状

- doctor で `i2c=unavailable` / `/dev/i2c-1` が `[error]`
- container 内に `/dev/i2c-1` が無い
- `requestNodeI2CAccess()` が失敗し、Runtime 上で I2C が unavailable

### 対処

1. host で I2C を有効化して reboot する（[raspberry-pi-setup.md](./raspberry-pi-setup.md)）
2. `sudo ./scripts/enable-i2c.sh --check`
3. `./scripts/start.sh` し直し、`docker compose exec chirimen-server ls -l /dev/i2c-1`

slave が接続されていない場合、scan 結果が空になるのは正常なことがある。配線とアドレスを確認する。検証用 slave は ADT7410（expected `0x48`）。操作手順は [i2c-scan.md](./i2c-scan.md)。配線は [検証仕様](../examples/i2c-scan.md)。

## Permission denied（GPIO / I2C）

### 症状

`export` / `write` / I2C `open` などで Permission denied。

### 確認

```sh
ls -l /dev/gpiomem* /dev/i2c-1 /sys/class/gpio
getent group gpio
getent group i2c
docker compose exec chirimen-server ls -l /sys/class/gpio
docker compose exec chirimen-server ls -l /dev/gpiomem* /dev/i2c-1 2>/dev/null || true
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
docker compose exec chirimen-server sh -c 'mount | grep -E "sys|gpio"; ls -l /sys/class/gpio/gpio* 2>/dev/null | head'
```

`/sys` が `ro` で `/sys/class/gpio` だけが `rw`、かつ `gpioN` が `../../devices/...` を指していればこの症状。

### 対処

`compose.yaml` で `/sys/class/gpio` に加え `/sys/devices` も mount する（現行 main）。再作成後に再試行する。

```sh
./scripts/start.sh --force-recreate
```

## health は OK だが I2C が unavailable

### 症状

`curl http://localhost:33330/health` は成功するが、I2C 操作ができない。

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

- **Pi 3 B+（#97）**: Raspbian OS 64-bit（`aarch64` / `6.18.34+rpt-rpi-v8`）で `/sys/class/gpio` が存在し `gpio=sysfs` / `i2c=i2c-dev` を確認済み。初期状態で `/dev/i2c-1` が無い場合は `scripts/enable-i2c.sh` 等で有効化する。A+ はスペック不足のため推奨環境外
- **Pi 4（#98）**: Raspbian OS 64-bit（`aarch64` / `6.18.34+rpt-rpi-v8`）で `/sys/class/gpio` が存在し `gpio=sysfs` / `i2c=i2c-dev` を確認済み。初期状態で `/dev/i2c-1` が無い場合は `scripts/enable-i2c.sh` 等で有効化する
- **Pi 5（#99）**: Model B Rev 1.0 では `/sys/class/gpio` が存在し `gpio=sysfs` で動作確認済み（kernel `2712`）。gpiochip 専用 backend は不要。container 内で `EROFS` になる場合は上記「GPIO export で EROFS」を参照（`/sys/devices` mount）

## 32-bit OS はサポート対象外

32-bit Raspberry Pi OS（`armv7l`）はサポート対象外である。Runtime と Browser Editor を同じ手順で使う推奨環境は **Raspbian OS 64-bit** のみ。host を 64-bit OS に切り替えてから [Getting Started](./getting-started.md) の手順を使う。

次のようなエラーは 32-bit OS で起きうる。対処は `--32bit` ではなく、64-bit OS への移行である。

```text
failed to resolve source metadata for docker.io/library/node:24-bookworm-slim:
no match for platform in manifest: not found
```

```text
NX   Nx Daemon was not able to compute the project graph.
NX   hashArray is not a function
```

過去の Runtime 実機結果は [Compatibility matrix](../architecture/compatibility.md) を参照。`Supported` とは書かない。

## Docker build が `i2c-bus` / `node-gyp` で失敗する

### 症状

`./scripts/start.sh` や `docker compose up --build` で次のようなエラーになる。

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

[`docker/server/Dockerfile`](../../docker/server/Dockerfile) の `deps` ステージに `python3` / `make` / `g++` と `npm_config_nodedir=/usr/local` が入っていること（現行 main）を確認し、再ビルドする。

```sh
./scripts/start.sh --build --force-recreate
```

`runtime` ステージは slim の `base` から作るため、最終 image に build tools は残らない。詳細は [Docker 構成](../architecture/docker.md)。

## Editor で Example が保存できない（Permission denied）

### 症状

Browser Editor から `docs/examples` 配下を保存すると Permission denied になる。または host 側のファイル所有者が `coder` / UID 1000 になり、host ユーザーで書けない。

### 確認

```sh
ls -ld docs/examples
id -u
id -g
docker compose --profile editor exec chirimen-editor id
```

起動ログの `editor uid=` が host の `id -u`:`id -g` と一致するか見る。

### 対処

- 推奨入口は `./scripts/start.sh --editor`（host uid を Editor に渡す）
- `docker compose --profile editor up` を直接使う場合は `CHIRIMEN_EDITOR_UID` / `CHIRIMEN_EDITOR_GID` / `CHIRIMEN_EDITOR_USER` を host に合わせる
- root では起動しない
- GPIO / I2C の Permission denied はこの節ではなく上記「Permission denied（GPIO / I2C）」

方針は [browser-editor.md の uid / gid](../architecture/browser-editor.md#uid--gid)。

## Editor の password / 設定が消えた

### 症状

container 再作成後に Editor の password が変わり、入れていた extension も無い。Example の編集内容は残っている。

### 原因

`docker compose down -v` または `docker volume rm` が named volume `chirimen-editor-config` / `chirimen-editor-local` を消した。workspace は bind mount のため残る。

### 確認

```sh
docker volume ls | grep chirimen-editor
docker compose --profile editor exec chirimen-editor cat /home/coder/.config/code-server/config.yaml
```

### 対処

設定を残すときは `docker compose down`（**`-v` なし**）で container だけ削除する。消してしまった password は新しい `config.yaml` を読み直す。password を固定したいときは host の `.env`（gitignored）に `CHIRIMEN_EDITOR_PASSWORD` を置き、`./scripts/start.sh --editor` で起動する。compose.yaml に `PASSWORD=` は書かない。Example の中身は host の `docs/examples` を見る。推奨 extension（Prettier / ESLint / 日本語パック）は named volume が消えると再インストールが必要。workspace の `.vscode` 推奨は bind mount に残る。

## LAN から Editor / Web Demo に届かない

### 症状

別マシンの Browser で `http://<Pi の IP>:8080` や `:4200` に接続できない。Pi 上の `http://127.0.0.1:8080` は開く。

### 原因

既定の host bind は `127.0.0.1` である。Internet にも LAN にも出さない。`--lan` なし、または `CHIRIMEN_PUBLISH_BIND` が `127.0.0.1` のまま。

### 確認

```sh
./scripts/start.sh --help
docker compose --profile editor port chirimen-editor 8080
```

起動ログの `publish:` が `127.0.0.1` か `0.0.0.0 (LAN)` かを見る。

### 対処

- LAN が必要なら `./scripts/start.sh --editor --lan`（または `CHIRIMEN_PUBLISH_BIND=0.0.0.0`）
- `--lan` だけで `--editor` が無いときは Runtime `33330` も含め bind は変わらない
- Internet へは出さない。reverse proxy は本リポジトリでは提供しない

方針は [browser-editor.md の Publish / bind](../architecture/browser-editor.md#publish--bind181)。

## LAN から Web Demo / Example は開くが GPIO / I2C が動かない

### 症状

別マシンで `http://<Pi の IP>:4200/` や `:4173/led-blink/` は表示されるが、接続状態が Error のまま。または GPIO / I2C 操作が失敗する。

### 原因

HTML Example の既定 WebSocket 先は `ws://localhost:33330/` で、別マシンの localhost を指す。Web Demo はページの hostname が localhost でなければ `ws://<hostname>:33330/` に接続する。Runtime は `--lan` しても bind を変えない（もともと全 interface）。

### 対処

- Web Demo は Pi の IP でページを開く（hostname 解決）。`http://127.0.0.1:4200/` を別マシンから開いても届かない
- HTML Example は script の前に `CHIRIMEN_WS_URL` を Pi の IP へ向ける（[browser-polyfill.md](./browser-polyfill.md)）
- `curl http://<Pi の IP>:33330/health` で Runtime を確認する
- Editor / web-demo container に GPIO / I2C device は渡していない

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

code-server は Microsoft Marketplace に接続しない。既定は Open VSX である。Microsoft 独占拡張は必須セットに含めない。

### 対処

- 必須の Prettier / ESLint / Japanese Language Pack は Open VSX の推奨から入れる
- Copilot 等は使えない前提にする。GPIO / I2C 操作は Editor 拡張ではなく Browser Polyfill 経路
- `.vsix` は最終手段。本リポジトリには置かない

方針は [browser-editor.md の Marketplace 制約](../architecture/browser-editor.md#marketplace-制約)。

## Example で ESLint が動かない

### 症状

ESLint 拡張を入れても、`docs/examples` の JS に lint が出ない。または eslint が見つからないと出る。

### 原因

Editor workspace は `docs/examples` のみで、`eslint` / `node_modules` が無い。monorepo の `pnpm lint` は host 向けである。

### 対処

- Example 編集では Prettier（保存時フォーマット）を使う
- monorepo の TypeScript lint は host で `pnpm lint`（[Development Guide](./development.md)）
- Editor workspace へ Nx は入れない（[#180](https://github.com/gurezo/chirimen-raspi-docker/issues/180) で再評価済み）

## Example の静的サーバ（4173）が開かない

### 症状

`http://127.0.0.1:4173/led-blink/` などが接続できない。または Editor terminal に `python3: command not found` と出る。

### 原因

Editor image に `python3-minimal` が入っていない古い image を使っている。または Run Task **Serve examples** をまだ起動していない。port `4173` は Editor 起動だけでは開かない。

### 対処

- `./scripts/start.sh --editor` のあと、Editor で Run Task **Serve examples**
- `docker compose --profile editor exec chirimen-editor python3 --version` で python3 があることを確認する。無いときは Editor image を再 build する
- host から配信する場合は `cd docs/examples/led-blink && python3 -m http.server 4173`（従来手順）

方針は [browser-editor.md の Example 編集](../architecture/browser-editor.md#example-編集--静的-serve179)。

## Web Demo（4200）が開かない

### 症状

`http://127.0.0.1:4200/` に接続できない。または host の `pnpm nx serve web-demo` が port 使用中で失敗する。

### 原因

`--editor` / Compose profile `editor` なしで Runtime only 起動している。または Web Demo image がまだ build されていない。host の Vite（`pnpm nx serve web-demo`）と Compose `chirimen-web-demo` が同じ port `4200` を使っている。

### 対処

- `./scripts/start.sh --editor` で Runtime + Editor + Web Demo を起動する
- `curl -fsS http://127.0.0.1:4200/` が HTML を返すことを確認する
- `docker compose --profile editor ps` で `chirimen-web-demo` が running か見る
- host で Vite HMR を使うときは Compose の web-demo を止める: `docker compose --profile editor stop chirimen-web-demo`

方針は [browser-editor.md の Web Demo 起動](../architecture/browser-editor.md#web-demo-起動180)。

## Web Demo は開くが GPIO / I2C が動かない

### 症状

`http://127.0.0.1:4200/` は表示されるが、接続状態が Error のまま。または GPIO / I2C 操作が失敗する。

### 原因

WebSocket 先は Browser から `ws://localhost:33330/` である。web-demo container は静的ファイルだけを配信し、GPIO / I2C には触れない。Runtime が止まっていると Polyfill は接続できない。

### 対処

- `curl http://localhost:33330/health` で Runtime を確認する
- 接続先は `ws://localhost:33330/`（[browser-polyfill.md](./browser-polyfill.md)）
- Editor / web-demo container に GPIO / I2C device は渡していない

## Example を保存しても Browser に反映されない

### 症状

Editor で `main.js` を保存したあと、Example の見た目や LED の動きが変わらない。

### 原因

HTML サンプルは静的ファイルである。hot reload は無い。

### 対処

- Example を開いている Browser タブを reload する
- 開いている URL が `http://127.0.0.1:4173/led-blink/` など、編集中のディレクトリと一致しているか確認する
- `polyfill.js` を変えた場合は host で `pnpm nx bundle browser-polyfill` したあと reload する

## 日本語パックを入れても UI が英語のまま

### 症状

`MS-CEINTL.vscode-language-pack-ja` を入れたあとでもメニューが英語。

### 原因

Language Pack のインストールだけでは locale は切り替わらない。Dockerfile に `--locale ja` は付けていない。

### 対処

Command Palette から Display Language（または「表示言語の構成」）を開き、`ja` を選んで再読み込みする。

方針は [browser-editor.md の Extension](../architecture/browser-editor.md#extension)。

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

`[error]` の行を上から解消する。典型順:

1. Raspberry Pi 実機か
2. Docker / Compose / daemon
3. `/dev/i2c-1`（`enable-i2c.sh`）— `i2c=unavailable` は error
4. GPIO は `unavailable` / `gpiochip` unsupported でも `[warn]`（exit 0 可）。必要なら `/sys/class/gpio` と `/dev/gpiochip*` を確認

解消後に Getting Started へ戻る: [getting-started.md](./getting-started.md)

## LED が点かない

配線・`polyfill.js` の配置・HTML サンプル / web-demo の切り分けは [gpio-led-blink.md](./gpio-led-blink.md) の Troubleshooting を参照する。

## タクトスイッチを押しても値が変わらない

配線・web-demo の Start / onchange / HTML サンプルの切り分けは [gpio-input.md](./gpio-input.md) の Troubleshooting を参照する。

## I2C Scan で address が出ない

配線・I2C 有効化・web-demo の Scan / hex 一覧の切り分けは [i2c-scan.md](./i2c-scan.md) の Troubleshooting を参照する。
