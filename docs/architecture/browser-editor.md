# Browser Editor 技術選定

Phase 8 で利用する Browser ベースの VS Code 系 Editor を記録する。

関連:

- 親 Issue: [#172 Phase 8: Browser Development Environment](https://github.com/gurezo/chirimen-raspi-docker/issues/172)
- 子 Issue: [#173 Browser Editor の技術選定を行う](https://github.com/gurezo/chirimen-raspi-docker/issues/173)
- 後続: [#174 Docker image](https://github.com/gurezo/chirimen-raspi-docker/issues/174) / [#175 Compose](https://github.com/gurezo/chirimen-raspi-docker/issues/175) / [#176 永続化](https://github.com/gurezo/chirimen-raspi-docker/issues/176) / [#177 optional service](https://github.com/gurezo/chirimen-raspi-docker/issues/177) / [#178 Extension](https://github.com/gurezo/chirimen-raspi-docker/issues/178) / [#179 Example 編集](https://github.com/gurezo/chirimen-raspi-docker/issues/179) / [#180 Web Demo](https://github.com/gurezo/chirimen-raspi-docker/issues/180) / [#181 Security](https://github.com/gurezo/chirimen-raspi-docker/issues/181) / [#183 利用ガイド](https://github.com/gurezo/chirimen-raspi-docker/issues/183) / [#201 プリインストール Extension 削除](https://github.com/gurezo/chirimen-raspi-docker/issues/201)
- [overview.md](./overview.md)
- [docker.md](./docker.md)

## Status

Accepted（#173。image は #174。Compose は `compose.yaml` の `chirimen-editor`（#175）。永続化は #176。optional profile は #177。初期設定は #178。Example 編集 / 静的 serve は #179。Web Demo Compose は #180。Security は #181。Extension はプリインストール・推奨しない（#201））

## Context

旧 CHIRIMEN 環境にあった VS Code ベースの開発体験を、Docker / Browser ベースの本リポジトリ上で再構築する。

最も重要なルールは、Editor を新しい Hardware Runtime にしないことである。GPIO / I2C は Browser Polyfill → WebSocket → `chirimen-server` → Node Runtime を経由する。Editor container へ `/dev/gpio*` / `/dev/i2c-1` を渡さない。

```text
Browser
  |
  +--> Editor service
  |      |
  |      +--> workspace / source code
  |
  +--> Web application
          |
          v
      Browser Polyfill
          |
          v
       WebSocket
          |
          v
    chirimen-server
          |
          v
      Node Runtime
          |
          v
       GPIO / I2C
```

親 Issue の方針:

- `chirimen-server` container に Editor を直接インストールしない
- Editor は独立した Docker service とする
- Editor が停止しても CHIRIMEN Runtime は動作可能とする
- Runtime が停止しても Editor 自体は起動可能とする
- Raspberry Pi 3 / 4 / 5 の差異を Editor 側へ持ち込まない
- Phase 8 の目的は特定製品への固定ではなく、Browser から VS Code 系の開発体験を提供すること

#173 では Docker image / Compose を追加しない。image は [#174](https://github.com/gurezo/chirimen-raspi-docker/issues/174)。Compose service は [`compose.yaml`](../../compose.yaml) の `chirimen-editor`（[#175](https://github.com/gurezo/chirimen-raspi-docker/issues/175)）。

## 第一候補: code-server

初期候補は [Coder `code-server`](https://github.com/coder/code-server) である。VS Code を patch して Browser から利用できるようにした self-hosted Editor で、公式 Docker image と password 認証を持つ。

一次情報:

- [Install](https://coder.com/docs/code-server/install)
- [FAQ](https://coder.com/docs/code-server/FAQ)
- [Releases](https://github.com/coder/code-server/releases)
- [Docker Hub `codercom/code-server`](https://hub.docker.com/r/codercom/code-server)

メンテナは Coder。Desktop GUI 版 VS Code を container 内で直接起動する構成は、親 Issue の Out of Scope のため評価しない。

## Architecture

Raspberry Pi で利用する architecture は次の2系統である。サポート対象は 64-bit OS のみ。Runtime の Compatibility 正本は [Compatibility matrix](./compatibility.md)。

| Architecture | 典型環境 | Runtime | Editor 調査結果 |
| --- | --- | --- | --- |
| `arm64`（`aarch64`） | Pi 3 / 4 / 5 の 64-bit OS | 64-bit Dockerfile（Node 24） | 公式 Docker image / GitHub release が対応 |
| `arm32` / `armv7`（`armv7l`） | 32-bit OS（サポート対象外） | `Dockerfile.32bit`（Node 22）。サポート対象外 | 公式 Docker image / 現行 GitHub release に資産が無い |

開発マシン（macOS の Docker Desktop など）は `amd64` で確認する想定。公式 image は `amd64` と `arm64` を出す。

調査時点（2026-08-17）の最新安定版は [v4.132.0](https://github.com/coder/code-server/releases/tag/v4.132.0)（2026-08-10）。release 資産は次のみ。

- `linux-amd64`（`.tar.gz` / `.deb` / `.rpm`）
- `linux-arm64`（`.tar.gz` / `.deb` / `.rpm`）
- `macos-amd64` / `macos-arm64`

`linux-armv7` / `armhf` の資産は無い。未検証の実機結果は `Supported` と書かない。

## Docker image

公式 image は `codercom/code-server`。

[Install の Docker 節](https://coder.com/docs/code-server/install) の記述:

> Our official image supports `amd64` and `arm64`. For `arm32` support, you can use a community-maintained code-server alternative.

公式が案内する arm32 代替は [linuxserver/code-server](https://hub.docker.com/r/linuxserver/code-server)。ただし LinuxServer.io は 2023-07-01 以降、全 image の 32-bit Arm（armhf）を [廃止](https://info.linuxserver.io/issues/2023-07-01-armhf/) している。更新されない旧 tag に依存する構成は採らない。

公式の Docker 起動例は、workspace と設定を分離して mount する。

```sh
mkdir -p ~/.config
docker run -it --name code-server -p 127.0.0.1:8080:8080 \
  -v "$HOME/.local:/home/coder/.local" \
  -v "$HOME/.config:/home/coder/.config" \
  -v "$PWD:/home/coder/project" \
  -u "$(id -u):$(id -g)" \
  -e "DOCKER_USER=$USER" \
  codercom/code-server:latest
```

本リポジトリでは `latest` を使わず、semver タグで pin する（[Decision](#decision)）。image は [`docker/editor/Dockerfile`](../../docker/editor/Dockerfile)（[#174](https://github.com/gurezo/chirimen-raspi-docker/issues/174)）。Compose service は [`compose.yaml`](../../compose.yaml) の `chirimen-editor`（[#175](https://github.com/gurezo/chirimen-raspi-docker/issues/175)）。

| 項目 | 内容 |
| --- | --- |
| 公式 image | `codercom/code-server` |
| 対応 architecture | `linux/amd64`, `linux/arm64` |
| 非対応 | `linux/arm/v7`（arm32 / armhf） |
| 既定 port | `8080` |
| 既定ユーザー | `coder`（root ではない） |
| health | `/healthz`（認証不要。[FAQ](https://coder.com/docs/code-server/FAQ)） |
| コミュニティ image | 採用しない（armhf 廃止、公式 image で arm64 を賄える） |

公式 Install は Raspberry Pi への npm インストールも案内するが、親 Issue は独立した Docker service を要求するため、host への npm インストールは採用しない。

## Extensions

chirimen-raspi-docker does not preinstall, distribute, recommend,
or require any code-server / VS Code extensions.

Extensions are entirely optional.

Users may choose, install, update, and remove extensions at their own discretion.

The CHIRIMEN Runtime and bundled examples do not require editor extensions.

[#201](https://github.com/gurezo/chirimen-raspi-docker/issues/201) でこの方針を固定する。Dockerfile に `code-server --install-extension` は書かない。`.vsix` はリポジトリに置かない。workspace の `extensions.json` による recommendation も提供しない。

code-server 内蔵の HTML / CSS / JavaScript / TypeScript Language Features は Editor 本体の一部であり、プリインストール Extension ではない。

ユーザーが任意に導入した Extension は Docker image に含めない。永続化は named volume `chirimen-editor-local`（`/home/coder/.local`）に任せる（[#176](https://github.com/gurezo/chirimen-raspi-docker/issues/176)。下記 [Workspace volume](#workspace-volume)）。

| 置き場 | Extension |
| --- | --- |
| Docker image | 含めない |
| User volume `chirimen-editor-local` | ユーザー自身が導入したものだけ |

`docker compose down`（`-v` なし）ではユーザー導入 Extension は残る。`docker compose down -v` では消える。再インストールはユーザー判断である。

lint / format / TypeScript のプロジェクト作業は host の `pnpm lint` / `pnpm test` / `pnpm build`（[development.md](../guides/development.md)）。Editor workspace（`docs/examples`）に `eslint` / `node_modules` は無い。Editor workspace へ Nx は入れない。[`docs/examples/.prettierrc.json`](../examples/.prettierrc.json) は Extension ではなく任意のフォーマット設定である。workspace 設定は [`docs/examples/.vscode/settings.json`](../examples/.vscode/settings.json)（tab / eol / encoding）。ユーザー固有のテーマ / キーバインド / Extension は git に含めない。

GPIO / I2C 操作用の Extension は使わない。Hardware は Browser Polyfill → WebSocket → Runtime。

## Marketplace 制約

code-server は Microsoft 公式 Marketplace には接続しない。既定は Open VSX / Coder extension marketplace である。本リポジトリは Marketplace の切り替え設定を追加しない。

[FAQ](https://coder.com/docs/code-server/FAQ) の対比:

- GitHub Codespaces / VS Code web（`code serve-web`）は Microsoft Marketplace を使える
- code-server は self-contained な web view と独自 marketplace を持ち、Microsoft のサーバーへ呼び出さない
- Microsoft Marketplace が必要な場合は VS Code web の方が適する、と公式は案内している

| 項目 | 方針 |
| --- | --- |
| 既定 gallery | code-server 既定（Open VSX / Coder extension marketplace） |
| Microsoft Marketplace | 接続設定を追加しない |
| Microsoft 独占拡張（GitHub Copilot など） | 期待しない。プロジェクトは特定 Extension を必須・推奨しない（#201） |
| `.vsix` | リポジトリに置かない |
| 独自 `EXTENSIONS_GALLERY` | 採用しない |

CHIRIMEN Example の編集・Browser 実行に Editor Extension は必須ではない。GPIO / I2C 操作は Editor 内ではなく Browser Polyfill 経路で行う。

## Workspace volume

公式 Docker 例は次の3つを分離する。

| Host | Container | 内容 |
| --- | --- | --- |
| `$PWD` | `/home/coder/project` | 編集対象の source / workspace |
| `$HOME/.local` | `/home/coder/.local` | extension、user-data、heartbeat |
| `$HOME/.config` | `/home/coder/.config` | `code-server/config.yaml`（認証など） |

本リポジトリでもこの分離を採用する。実装は [#176](https://github.com/gurezo/chirimen-raspi-docker/issues/176)。container image / `/tmp` / build cache は永続化しない。

| 対象 | 方法 | 理由 |
| --- | --- | --- |
| workspace（Phase 7 Example） | bind mount `./docs/examples` → `/home/coder/project` | git 管理のソース。host から差分が見え、container 削除後も残る |
| editor settings / password | named volume `chirimen-editor-config` → `/home/coder/.config` | `config.yaml` は git に置かない。`compose down`（`-v` なし）後も password が残る |
| extensions / user-data | named volume `chirimen-editor-local` → `/home/coder/.local` | 公式と同じ分離。host `$HOME` を汚さない |
| container image / `/tmp` / build cache | 永続化しない | image 再 build と container 再作成で捨てる |

workspace を named volume にはしない。Example が git から切り離され、host で編集確認できなくなるため。

`docker compose down`（`-v` なし）は named volume を残す。`docker compose down -v` は設定・拡張・password を消す。workspace の bind mount はどちらでも消えない。

### uid / gid

公式 image の `fixuid` と `DOCKER_USER` を使う。root では起動しない。GPIO / I2C device は渡さない。

| 入口 | uid |
| --- | --- |
| `./scripts/start.sh --editor` | host の `id -u` / `id -g` / `id -un` を Compose override に書く |
| `docker compose --profile editor up` 直接 | `CHIRIMEN_EDITOR_UID` / `CHIRIMEN_EDITOR_GID` / `CHIRIMEN_EDITOR_USER`。未設定時は `1000` / `coder` |

bind mount した `docs/examples` への書き込みを host ユーザー所有に合わせる。named volume 初回の所有権は image の `chown coder` と `fixuid` に任せる。workspace 設定は git 管理の [`docs/examples/.vscode/settings.json`](../examples/.vscode/settings.json) / [`tasks.json`](../examples/.vscode/tasks.json) と [`.prettierrc.json`](../examples/.prettierrc.json)（#178 / #179 / #201）。`extensions.json` による recommendation は置かない。ユーザー固有の `.vscode` ファイルは bind mount に出うるが git には含めない。

Editor workspace に載せる対象は Phase 7 Example（GPIO LED Blink / GPIO Input / I2C Scan）である。実行は Editor 内ではなく、Browser の HTML サンプル / Web Demo → Polyfill → WebSocket → Runtime。Editor に GPIO / I2C device は渡さない。

### Example 編集 / 静的 serve（#179）

配置は [`docs/examples/README.md`](../examples/README.md) を正とする。monorepo 全体は mount しない。`package.json` / `node_modules` は置かない。

| ディレクトリ | Example |
| --- | --- |
| `led-blink/` | GPIO LED Blink |
| `button/` | GPIO Input / onchange |
| `i2c-scan/` | I2C Scan（Public polyfill の `open` + `writeByte(0x00)` で合成） |

依存:

| 作業 | 場所 |
| --- | --- |
| HTML / JS の編集 | Editor workspace（`docs/examples`） |
| `pnpm install` | しない（Example に依存は無い） |
| `pnpm nx bundle browser-polyfill` | **host**。`polyfill.js` を各 HTML ディレクトリへコピーする |
| `pnpm nx serve web-demo`（Vite HMR） | **host**。Compose の `chirimen-web-demo`（port 4200）と衝突するため、使うときはその service を止める |

serve は Compose `chirimen-examples`（nginx。cwd 相当は bind `docs/examples`）。`--editor` で Editor / Web Demo と一緒に起動する。Run Task **Serve examples**（[`tasks.json`](../examples/.vscode/tasks.json)）は URL 案内のみ。Compose の host publish は既定 `127.0.0.1:4173:4173`。LAN は `CHIRIMEN_PUBLISH_BIND=0.0.0.0` または `./scripts/start.sh --editor --lan`（[#181](https://github.com/gurezo/chirimen-raspi-docker/issues/181)）。

| 項目 | 方針 |
| --- | --- |
| Service | [`compose.yaml`](../../compose.yaml) の `chirimen-examples`。profile `editor` |
| Image | [`docker/examples/Dockerfile`](../../docker/examples/Dockerfile)。nginx（`nginx:1.30.4-alpine`）が bind `docs/examples` を静的配信 |
| Port | 既定 `127.0.0.1:4173:4173`。Editor `8080` / Web Demo `4200` / Runtime `33330` と分離する。LAN は同じ `CHIRIMEN_PUBLISH_BIND` / `--lan`（#181） |
| URL | `http://127.0.0.1:4173/led-blink/` など |
| Editor terminal | サーバは起動しない。Run Task **Serve examples** が URL を出す |
| GPIO / I2C | 渡さない。Browser 内の Polyfill が Runtime の WebSocket へ接続する |
| `depends_on` | 付けない。Runtime / Editor / Web Demo と独立 |

```text
http://127.0.0.1:4173/led-blink/
http://127.0.0.1:4173/button/
http://127.0.0.1:4173/i2c-scan/
```

静的ファイルのため hot reload は無い。Editor で保存したあと Example タブを reload する。WebSocket 先は同一ホストなら `ws://localhost:33330/`。LAN の別マシンから開くときは script 前に `CHIRIMEN_WS_URL` を Pi の IP へ向ける。Compose を使わず host で `python3 -m http.server 4173` する手順も残す。

### Web Demo 起動（#180）

編集（Editor）と実行（別 Browser タブ）を分ける。Editor image に Node / pnpm / Nx は入れない。workspace は `docs/examples` のまま。

```text
./scripts/start.sh --editor
  → Editor     http://127.0.0.1:8080
  → Examples   http://127.0.0.1:4173/led-blink/  （Compose が起動済み）
  → Web Demo   http://127.0.0.1:4200/   （Compose が起動済み）
  → Runtime    ws://localhost:33330/
```

| 項目 | 方針 |
| --- | --- |
| Service | [`compose.yaml`](../../compose.yaml) の `chirimen-web-demo`。profile `editor` |
| Image | [`docker/web-demo/Dockerfile`](../../docker/web-demo/Dockerfile)。Vite production build を nginx（`nginx:1.30.4-alpine`）で静的配信 |
| Port | 既定 `127.0.0.1:4200:4200`。Editor `8080` / Example `4173` / Runtime `33330` と分離する。LAN は同じ `CHIRIMEN_PUBLISH_BIND` / `--lan`（#181） |
| URL | `http://127.0.0.1:4200/`（`#/gpio-output` / `#/gpio-input` / `#/i2c-scan`） |
| Editor terminal | サーバは起動しない。Run Task **Open Web Demo**（[`tasks.json`](../examples/.vscode/tasks.json)）が URL を出す |
| GPIO / I2C | 渡さない。Browser 内の Polyfill が Runtime の WebSocket へ接続する（web-demo container 経由ではない） |
| `depends_on` | 付けない。Runtime / Editor と独立 |

hot reload:

| 経路 | HMR |
| --- | --- |
| Compose `chirimen-web-demo` | 無し。静的 production build。再 build は image 再 build。タブは reload |
| Compose `chirimen-examples`（4173） | 無し。bind `docs/examples`。保存後に Example タブを reload（#179） |
| host `pnpm nx serve web-demo` | 有り（Vite）。開発者向け。port 4200 が衝突するので Compose web-demo を先に止める |

WebSocket:

| 面 | default | 上書き |
| --- | --- | --- |
| HTML Example（IIFE） | `ws://localhost:33330/` | script 前の `CHIRIMEN_WS_URL`、または `installBrowserPolyfill({ url })` |
| web-demo（ESM） | ページが localhost / `127.0.0.1` なら `ws://localhost:33330/`（`WEB_DEMO_RUNTIME_WS_URL`） | それ以外の hostname なら `ws://<hostname>:33330/`（#181）。設定 UI は無い |

## Authentication

既定は password 認証。Dockerfile は `--auth password` を付ける。`auth: none` は既定にもフラグにもしない。

設定は named volume 上の `~/.config/code-server/config.yaml`。

[FAQ](https://coder.com/docs/code-server/FAQ) の例:

```yaml
bind-addr: 127.0.0.1:8080
auth: password
password: mew...22 # Randomly generated for each config.yaml
cert: false
```

| 項目 | 内容 |
| --- | --- |
| 既定 | `auth: password`。未設定なら初回起動時に password を生成して `config.yaml` へ書く |
| 任意ピン | host の `CHIRIMEN_EDITOR_PASSWORD`。`./scripts/start.sh --editor` が非空のときだけ container の `PASSWORD` に渡す |
| ハッシュ | `CHIRIMEN_EDITOR_HASHED_PASSWORD`（Argon2）。`PASSWORD` より優先。Compose YAML に書く場合は `$` を `$$` にする |
| Git | password / `.env` / `config.yaml` は commit しない。[`.env.example`](../../.env.example) のみ。empty `PASSWORD=` を compose.yaml に書かない |
| 無効化 | `auth: none` は本リポジトリでは使わない。SSH port forward 時の公式案内であっても既定にしない |
| レート制限 | 1分あたり2回、加えて1時間あたり12回 |
| 外部 IdP | Pomerium / oauth2-proxy / Cloudflare Access 等の reverse proxy。[Guide](https://coder.com/docs/code-server/guide)。本リポジトリでは追加しない |

秘密情報の置き場:

| 置き場 | 用途 |
| --- | --- |
| named volume `chirimen-editor-config` | 自動生成 password（`config.yaml`） |
| host `.env`（gitignored） | 任意の `CHIRIMEN_EDITOR_PASSWORD` / `CHIRIMEN_EDITOR_HASHED_PASSWORD` / `CHIRIMEN_PUBLISH_BIND` |
| Git | 置かない |

## Publish / bind（#181）

host 側の publish と container 内 `--bind-addr` は別である。Dockerfile の `--bind-addr 0.0.0.0:8080` は Docker NAT 用。Internet へ出すかどうかは Compose の host bind で決める。

| 経路 | host bind | 認証 | TLS | 起動 |
| --- | --- | --- | --- | --- |
| 同一ホスト / SSH port forward（既定） | `127.0.0.1` | password | HTTP で足りる（localhost は secure context） | `./scripts/start.sh --editor` |
| LAN | `0.0.0.0` | password 必須 | HTTP。IP 直打ちでは webview が失敗しうる | `./scripts/start.sh --editor --lan` または `CHIRIMEN_PUBLISH_BIND=0.0.0.0` |
| Internet | Compose では出さない | reverse proxy + IdP を推奨 | HTTPS 必須 | 本リポジトリでは提供しない |

対象 port は Editor `8080` / Example `4173` / Web Demo `4200`。Runtime `33330` は既存どおり全 interface（PC Browser → Pi の経路）。`--lan` は Runtime の bind を変えない。`--lan` 単体（`--editor` なし）は何もしない。

GPIO / I2C は Editor / Examples / Web Demo に渡さない。`devices` / `privileged` / `/sys/class/gpio` / `/sys/devices` は `chirimen-server` のみ。Web Demo と Examples は `security_opt: no-new-privileges:true`。Editor には `no-new-privileges` も `cap_drop: ALL` も付けない。公式 entrypoint の `fixuid` が setuid を必要とし、どちらも container を 8080 bind 前に終了させる。

## HTTPS / reverse proxy

code-server は WebSocket で Browser と通信する。公式 [Guide](https://coder.com/docs/code-server/guide) の公開方法:

| 方法 | いつ使うか |
| --- | --- |
| SSH port forward | 開発マシンに SSH があるとき。公式が最も推奨。既定の `127.0.0.1` と組み合わせる |
| reverse proxy + Let's Encrypt（Caddy / NGINX） | ドメインがあり Internet から HTTPS で開きたいとき。WebSocket の `Upgrade` ヘッダが必要。本リポジトリでは追加しない |
| self-signed cert（`--cert`） | 最終手段。iPad では動かないことがある。採用しない |

HTTPS が必要になる条件:

- `localhost` / `127.0.0.1` の HTTP は [secure context](https://coder.com/docs/code-server/FAQ)。既定経路はこれで足りる
- LAN の IP 直打ち HTTP は password 必須だが、Service Worker / webview の登録に失敗しうる
- Internet 公開はドメイン + TLS 終端が必須

TLS 終端用の `docker/nginx` は [overview.md](./overview.md) どおり未実装のまま残す。reverse proxy の Compose 追加は必要になった別 Issue で行う。

## Upgrade

公式 image は Docker Hub の tag で配る。FAQ は更新通知を code-server の差分の一つとして挙げる。

本リポジトリの方針:

| 項目 | 内容 |
| --- | --- |
| 追跡方法 | `codercom/code-server:<semver>` を明示 pin。`latest` は使わない |
| アップグレード | Dockerfile / Compose の tag を更新する PR。自動追従しない |
| 設定・workspace | named volume と bind mount に残す。image / container 再作成後も `config.yaml` / extension / 編集中の Example を維持する（[#176](https://github.com/gurezo/chirimen-raspi-docker/issues/176)） |
| 互換性 | 新 tag の architecture が引き続き `amd64` / `arm64` のみであることを release 資産で確認する |
| 実機確認 | Raspberry Pi 3 / 4 / 5 での Editor 検証は [#182](https://github.com/gurezo/chirimen-raspi-docker/issues/182) |

host への npm / install.sh による上書きは採用しない。Editor は Docker service としてだけ上げる。

## License

[code-server の LICENSE](https://github.com/coder/code-server/blob/main/LICENSE) は MIT（Copyright 2019 Coder Technologies Inc.）。再配布・改変・商用利用は、著作権表示と許諾文の保持を条件に許可される。

VS Code 本体の OSS 版も MIT である。code-server は submodule の VS Code に patch を当てて Browser 向けにしている（[FAQ: code-server と OpenVSCode-Server の違い](https://coder.com/docs/code-server/FAQ)）。

注意:

- 本リポジトリは code-server / VS Code Extension を同梱・配布・推奨しない（#201）
- ユーザーが任意に導入する Extension のライセンス・利用条件は、それぞれの Extension の条件に従う
- プロジェクト自身が配布していないユーザー導入 Extension は、`chirimen-raspi-docker` の Third Party License 管理対象には含めない
- GitHub Copilot など Marketplace 専用拡張は、ライセンス上も技術上も本構成の対象外
- Desktop GUI 版 VS Code を container で動かす製品ライセンスは、親 Issue の Out of Scope のため評価しない

本リポジトリのドキュメントと Docker 設定から公式 image を参照するだけであれば、MIT の再配布条件を追加で満たす必要は生じない。image を再配布する場合は LICENSE の表示を残す。

## 候補比較

Desktop GUI 版 VS Code の container 起動は親 Issue の Out of Scope のため比較しない。

| 項目 | code-server（Coder） | OpenVSCode Server（Gitpod） | Theia |
| --- | --- | --- | --- |
| ライセンス | MIT | MIT | EPL-2.0 / GPL-2.0 等 |
| Docker 公式 image | `codercom/code-server`（amd64 / arm64） | `gitpod/openvscode-server` | 製品ごとに分散 |
| 認証 | 組み込み password / hashed-password | connection token。password UI は無い | 製品依存 |
| Marketplace | Open VSX / Coder gallery | 公式に近い Microsoft Marketplace | Open VSX |
| 設定 | `config.yaml` | 主に CLI フラグ | 製品依存 |
| self-host 向け差分 | sub-path、内蔵 proxy、更新通知、disk 上の settings | upstream VS Code を Browser で出すことに特化 | VS Code そのものではない |
| VS Code 設定の再利用 | 可能 | 近い | 不可（FAQ） |

OpenVSCode Server は Marketplace 互換で有利だが、password 認証・`config.yaml`・内蔵 proxy が薄い。Phase 8 は LAN の Raspberry Pi 上で optional な Editor service を出すことが主目的なので、self-host 向けの差分がある code-server を採る。

Theia は Monaco / extension API を借りた別 Editor であり、親 Issue が求める VS Code 系体験ではない。

## Decision

Phase 8 の Browser Editor は **Coder `code-server`** とする。

### 決定事項

| 項目 | 内容 |
| --- | --- |
| 製品 | Coder `code-server` |
| 配布 | 公式 Docker image `codercom/code-server` |
| Version policy | semver タグで pin。初期ピンは `4.132.0`（調査時点の最新安定版。[v4.132.0](https://github.com/coder/code-server/releases/tag/v4.132.0)）。`latest` 禁止 |
| 対応 architecture | `linux/arm64`（Raspberry Pi 上の Editor）、`linux/amd64`（開発確認） |
| 非対応 architecture | `arm32` / `armv7` / `armhf`。公式 image も現行 release 資産も無い。linuxserver の armhf は廃止済み |
| 32-bit OS | サポート対象外。`Dockerfile.32bit` は削除しないが、Editor は出さない |
| Pi モデル分岐 | しない。Editor は architecture（64-bit）で揃える |
| 認証 | 既定は password（`--auth password`）。`auth: none` は使わない。詳細は [Authentication](#authentication)（#181） |
| HTTPS | 既定は HTTP + password + `127.0.0.1`。Internet 公開時は reverse proxy。`docker/nginx` は未実装のまま（#181） |
| Marketplace | code-server 既定。Microsoft Marketplace 接続設定は追加しない |
| 初期設定 / extension | プリインストール・配布・推奨・必須化しない。選択・導入・更新・削除はユーザーへ委ねる。ユーザー導入分は named volume で保持する（#201） |
| GPIO / I2C | Editor に device を渡さない |
| 起動 | 既定は Runtime only。Editor / Examples / Web Demo は Compose profile `editor` / `./scripts/start.sh --editor`（#177 / #179 / #180）。LAN は `--lan`（#181） |
| 永続化 | workspace は bind `docs/examples`。settings / extensions は named volume。uid は host（`start.sh --editor`）または `1000`（Compose 直接）。root 禁止（#176） |
| Example 編集 / serve | HTML は `docs/examples`。Compose `chirimen-examples` が host `127.0.0.1:4173`（既定）で静的配信（#179）。LAN は `--lan` |
| Web Demo | Compose `chirimen-web-demo` が host `127.0.0.1:4200`（既定）で production build を静的配信（#180）。LAN 時の WS 先はページの hostname。Editor に Node は入れない。HMR は host の `pnpm nx serve web-demo` |

#174 は [`docker/editor/Dockerfile`](../../docker/editor/Dockerfile) で `codercom/code-server:4.132.0` をベースにした。#175 は [`compose.yaml`](../../compose.yaml) に `chirimen-editor` を追加した。#176 は workspace bind と settings named volume、host uid を固定した。#177 は `profiles: [editor]` で opt-in にした。#178 は Example `.vscode` の初期設定を固定し、image へのプリインストールはしない。#201 は recommendation も含め Extension をユーザー管理へ移した。#179 は Example の配置、port `4173`、I2C Scan HTML を固定した。Compose `chirimen-examples` が `docs/examples` を静的配信する。#180 は `chirimen-web-demo`（port `4200`）と Editor task **Open Web Demo** を固定した。#181 は既定 bind `127.0.0.1`、password 認証、LAN は `--lan`、秘密情報は Git 外、GPIO / I2C を渡さないことを固定した。Editor に `no-new-privileges` は付けない（公式 `fixuid` が setuid を必要とする）。tag を上げるときは本表と Dockerfile を同じ PR で更新する。

### Consequences

- 64-bit の Pi 3 / 4 / 5 と amd64 開発マシンから、Browser で VS Code 系 Editor を開ける道が決まる
- 32-bit OS はサポート対象外。Pi 3 B+ の 32-bit OS（`armv7l`）では Editor を提供しない。Editor は [#177](https://github.com/gurezo/chirimen-raspi-docker/issues/177) で optional（Compose profile `editor`）にした
- プロジェクトは特定 Extension をプリインストール・推奨・必須にしない（#201）。Microsoft 独占拡張も期待しない
- lint / test / build は host の `pnpm` / Nx。Editor workspace へ Nx は入れない（[#180](https://github.com/gurezo/chirimen-raspi-docker/issues/180)）
- Editor image の extra package 例外は `python3-minimal` のみ（#179 当時。Compose 経路の HTML 配信は `docker/examples`）。Node は入れない。Web Demo は別 image（`docker/web-demo`）
- 実機での Editor 起動確認は [#182](https://github.com/gurezo/chirimen-raspi-docker/issues/182)。単独 image の build / run は [#174](https://github.com/gurezo/chirimen-raspi-docker/issues/174)。Compose は [#175](https://github.com/gurezo/chirimen-raspi-docker/issues/175)。Example `.vscode` の初期設定は #178。Extension 方針は [#201](https://github.com/gurezo/chirimen-raspi-docker/issues/201)。Example 編集は [#179](https://github.com/gurezo/chirimen-raspi-docker/issues/179)。Web Demo 起動は [#180](https://github.com/gurezo/chirimen-raspi-docker/issues/180)。Security は [#181](https://github.com/gurezo/chirimen-raspi-docker/issues/181)。`Supported` とは書かない
