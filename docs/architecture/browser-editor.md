# Browser Editor 技術選定

Phase 8 で利用する Browser ベースの VS Code 系 Editor を記録する。

関連:

- 親 Issue: [#172 Phase 8: Browser Development Environment](https://github.com/gurezo/chirimen-raspi-docker/issues/172)
- 子 Issue: [#173 Browser Editor の技術選定を行う](https://github.com/gurezo/chirimen-raspi-docker/issues/173)
- 後続: [#174 Docker image](https://github.com/gurezo/chirimen-raspi-docker/issues/174) / [#175 Compose](https://github.com/gurezo/chirimen-raspi-docker/issues/175) / [#176 永続化](https://github.com/gurezo/chirimen-raspi-docker/issues/176) / [#177 optional service](https://github.com/gurezo/chirimen-raspi-docker/issues/177) / [#178 Extension](https://github.com/gurezo/chirimen-raspi-docker/issues/178) / [#179 Example 編集](https://github.com/gurezo/chirimen-raspi-docker/issues/179) / [#180 Web Demo](https://github.com/gurezo/chirimen-raspi-docker/issues/180) / [#181 Security](https://github.com/gurezo/chirimen-raspi-docker/issues/181) / [#183 利用ガイド](https://github.com/gurezo/chirimen-raspi-docker/issues/183)
- [overview.md](./overview.md)
- [docker.md](./docker.md)

## Status

Accepted（#173。image は #174。Compose は `compose.yaml` の `chirimen-editor`（#175）。永続化は #176。optional profile は #177。初期設定 / extension は #178。Example 編集 / 静的 serve は #179。Nx / web-demo は #180）

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

Raspberry Pi で利用する architecture は次の2系統である。サポート対象は 64-bit OS のみ。Runtime の Compatibility 正本は [docker.md の Compatibility matrix](./docker.md#compatibility-matrix)。

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

## Extension

code-server の extension は Desktop VS Code と同じく、UI の Extensions ビューまたは CLI で入れる。[FAQ](https://coder.com/docs/code-server/FAQ) の例:

```console
code-server --install-extension <extension id>
# example: code-server --install-extension wesbos.theme-cobalt2

# From the Coder extension marketplace
code-server --install-extension ms-python.python

# From a downloaded VSIX on the file system
code-server --install-extension downloaded-ms-python.python.vsix
```

[#178](https://github.com/gurezo/chirimen-raspi-docker/issues/178) の必須セットと入れ方を本節で固定する。Dockerfile に `code-server --install-extension` は足さない。新規環境では [`docs/examples/.vscode/extensions.json`](../examples/.vscode/extensions.json) の推奨から、利用者が Extensions ビューで入れる。

| 方法 | 用途 |
| --- | --- |
| Extensions ビュー | 必須の Open VSX 拡張を入れる既定経路 |
| `code-server --install-extension <id>` | 利用者が任意に CLI で入れる場合。image ビルドでは使わない |
| `.vsix` ファイル | Open VSX に無い場合の最終手段。本リポジトリには置かない |

設定と extension 本体は workspace とは別 volume に置く（公式 Docker 例の `~/.local` / `~/.config`）。永続化は [#176](https://github.com/gurezo/chirimen-raspi-docker/issues/176)（下記 [Workspace volume](#workspace-volume)）。

### 必須 extension（#178）

| 必須 | ID | 入手 |
| --- | --- | --- |
| HTML | `vscode.html-language-features` | code-server 内蔵。追加インストール不要 |
| CSS | `vscode.css-language-features` | code-server 内蔵。追加インストール不要 |
| Prettier | `esbenp.prettier-vscode` | Open VSX。[`extensions.json`](../examples/.vscode/extensions.json) で推奨 |
| ESLint | `dbaeumer.vscode-eslint` | Open VSX。同上 |
| Japanese Language Pack | `MS-CEINTL.vscode-language-pack-ja` | Open VSX。同上 |

`extensions.json` の `recommendations` には Open VSX から入れる3つだけを書く。内蔵 HTML / CSS は Marketplace から入れない。上記以外は必須にしない。

推奨 extension の semver は pin しない（ID のみ）。言語機能は image タグ `codercom/code-server:4.132.0` に追従する。利用者が入れる版は Open VSX のその時点の最新である。

日本語 UI にする場合は、Language Pack 導入後に Command Palette の Display Language で `ja` へ切り替える。Dockerfile の `--locale ja` は付けない。

### TypeScript / ESLint / Prettier

| 項目 | 方針 |
| --- | --- |
| TypeScript | 内蔵の JavaScript / TypeScript Language Features で足りる。Editor workspace の Example は JS。monorepo の TS は host（[development.md](../guides/development.md)） |
| ESLint | 必須として推奨する。`docs/examples` には `eslint` / `node_modules` が無いため、Example 上では lint が動かない。monorepo の `pnpm lint` は host。[#180](https://github.com/gurezo/chirimen-raspi-docker/issues/180) の Nx 導入後に再評価する |
| Prettier | Editor では採用する。repo 全体の format script / CI には入れない。`eslint-config-prettier` は Nx 既定のまま残す。Example 用設定は [`docs/examples/.prettierrc.json`](../examples/.prettierrc.json)（2 space、double quote、semicolon、LF） |

workspace 設定は [`docs/examples/.vscode/settings.json`](../examples/.vscode/settings.json)（`formatOnSave`、default formatter は Prettier）。ユーザー固有のテーマ / キーバインドは git に含めない。

### architecture により使えない extension

| 制約 | 内容 |
| --- | --- |
| Editor 自体 | `arm32` / `armv7` / `armhf` では Editor を提供しない（#173） |
| Microsoft Marketplace 独占 | GitHub Copilot、一部 Remote 系など。Open VSX に無い。期待しない |
| native extension | `linux-arm64`（または universal）資産が無いものは Pi 上で動かない |
| GPIO / I2C 操作用 | 使わない。Hardware は Browser Polyfill → WebSocket → Runtime |

`.vsix` の再配布や Microsoft 独占拡張のライセンス確認は、必要になった個別 Issue で行う。本 Issue では必須セットに含めない。

## Marketplace 制約

code-server は Microsoft 公式 Marketplace には接続しない。既定は Open VSX / Coder extension marketplace である。

[FAQ](https://coder.com/docs/code-server/FAQ) の対比:

- GitHub Codespaces / VS Code web（`code serve-web`）は Microsoft Marketplace を使える
- code-server は self-contained な web view と独自 marketplace を持ち、Microsoft のサーバーへ呼び出さない
- Microsoft Marketplace が必要な場合は VS Code web の方が適する、と公式は案内している

独自 gallery に切り替える場合は `EXTENSIONS_GALLERY` を設定できる。

```sh
export EXTENSIONS_GALLERY='{"serviceUrl": "https://my-extensions/api"}'
```

Phase 8 では既定の Open VSX を使う。独自 marketplace は導入しない。

| 項目 | 方針 |
| --- | --- |
| 既定 gallery | Open VSX / Coder extension marketplace |
| Microsoft Marketplace | 使わない |
| Microsoft 独占拡張（GitHub Copilot など） | 期待しない。必須セットに含めない（#178） |
| `.vsix` | Open VSX に無い場合の最終手段。本リポジトリには置かない |
| 独自 `EXTENSIONS_GALLERY` | 採用しない |

CHIRIMEN Example の編集・Browser 実行に Microsoft 独占拡張は必須ではない。GPIO / I2C 操作は Editor 内ではなく Browser Polyfill 経路で行う。

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

bind mount した `docs/examples` への書き込みを host ユーザー所有に合わせる。named volume 初回の所有権は image の `chown coder` と `fixuid` に任せる。推奨設定は git 管理の [`docs/examples/.vscode/extensions.json`](../examples/.vscode/extensions.json) / [`settings.json`](../examples/.vscode/settings.json) / [`tasks.json`](../examples/.vscode/tasks.json) と [`.prettierrc.json`](../examples/.prettierrc.json)（#178 / #179）。ユーザー固有の `.vscode` ファイルは bind mount に出うるが git には含めない。

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
| `pnpm nx serve web-demo` / その他 Nx | **host**。[#180](https://github.com/gurezo/chirimen-raspi-docker/issues/180) |

serve は Editor terminal の `python3 -m http.server 4173 --bind 0.0.0.0`（cwd は `/home/coder/project`）。Run Task の **Serve examples**（[`tasks.json`](../examples/.vscode/tasks.json)）でも同じ。Compose は `127.0.0.1:4173:4173` を出す（LAN は #181）。

```text
http://127.0.0.1:4173/led-blink/
http://127.0.0.1:4173/button/
http://127.0.0.1:4173/i2c-scan/
```

静的ファイルのため hot reload は無い。Editor で保存したあと Example タブを reload する。WebSocket 先は `ws://localhost:33330/`。host で各ディレクトリから `python3 -m http.server 4173` する手順も残す。

## Authentication

既定は password 認証。設定は `~/.config/code-server/config.yaml`。

[FAQ](https://coder.com/docs/code-server/FAQ) の例:

```yaml
bind-addr: 127.0.0.1:8080
auth: password
password: mew...22 # Randomly generated for each config.yaml
cert: false
```

| 項目 | 内容 |
| --- | --- |
| 既定 | `auth: password`。初回起動時に password を生成して `config.yaml` へ書く |
| ハッシュ | `hashed-password`（Argon2）を `password` より優先できる |
| 無効化 | `auth: none`。SSH port forward 時の公式案内。LAN 公開の既定にはしない |
| レート制限 | 1分あたり2回、加えて1時間あたり12回 |
| 外部 IdP | Pomerium / oauth2-proxy / Cloudflare Access 等の reverse proxy。[Guide](https://coder.com/docs/code-server/guide) |

Phase 8 の初期値は **LAN 向け password 認証** とする。Internet 公開や外部 IdP は [#181](https://github.com/gurezo/chirimen-raspi-docker/issues/181)。`auth: none` を既定にしない。

## HTTPS / reverse proxy

code-server は WebSocket で Browser と通信する。公式 [Guide](https://coder.com/docs/code-server/guide) の公開方法:

| 方法 | いつ使うか |
| --- | --- |
| SSH port forward | 開発マシンに SSH があるとき。公式が最も推奨。Tablet では使えない |
| reverse proxy + Let's Encrypt（Caddy / NGINX） | ドメインがあり Internet から HTTPS で開きたいとき。WebSocket の `Upgrade` ヘッダが必要 |
| self-signed cert（`--cert`） | 最終手段。iPad では動かないことがある |

Web view は [secure context](https://coder.com/docs/code-server/FAQ) を要求する。`localhost` は常に secure。IP アドレスの HTTP では Service Worker 登録に失敗しうる。

本リポジトリの初期構成:

- LAN / 同一ホストの Browser から HTTP + password で開く
- TLS 終端用の `docker/nginx` は [overview.md](./overview.md) どおり未実装のまま残す
- Internet 公開、HTTPS 必須、Web view を IP 直打ちで使いたい場合に reverse proxy が必要になる

reverse proxy の具体的な Compose 追加は本 Issue の範囲外。Security 方針の実装は #181。

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

- Microsoft Marketplace 上の拡張は各拡張のライセンスに従う。Open VSX 上の拡張も同様に個別ライセンス
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
| 認証 | 既定は password。詳細は #181 |
| HTTPS | 初期は HTTP + password。Internet 公開時は reverse proxy。`docker/nginx` は未実装のまま |
| Marketplace | Open VSX。Microsoft Marketplace は使わない |
| 初期設定 / extension | 必須は HTML / CSS（内蔵）と Prettier / ESLint / Japanese Language Pack（Open VSX 推奨）。Dockerfile へはプリインストールしない（#178） |
| GPIO / I2C | Editor に device を渡さない |
| 起動 | 既定は Runtime only。Editor は Compose profile `editor` / `./scripts/start.sh --editor`（#177） |
| 永続化 | workspace は bind `docs/examples`。settings / extensions は named volume。uid は host（`start.sh --editor`）または `1000`（Compose 直接）。root 禁止（#176） |
| Example 編集 / serve | HTML は `docs/examples`。Editor terminal の `python3` が `127.0.0.1:4173` で静的配信（#179）。Node / pnpm / Nx は host（#180） |

#174 は [`docker/editor/Dockerfile`](../../docker/editor/Dockerfile) で `codercom/code-server:4.132.0` をベースにした。#175 は [`compose.yaml`](../../compose.yaml) に `chirimen-editor` を追加した。#176 は workspace bind と settings named volume、host uid を固定した。#177 は `profiles: [editor]` で opt-in にした。#178 は必須 extension と Example `.vscode` を固定し、image へのプリインストールはしない。#179 は Example の配置、`python3` 静的サーバ、port `4173`、I2C Scan HTML を固定した。tag を上げるときは本表と Dockerfile を同じ PR で更新する。

### Consequences

- 64-bit の Pi 3 / 4 / 5 と amd64 開発マシンから、Browser で VS Code 系 Editor を開ける道が決まる
- 32-bit OS はサポート対象外。Pi 3 B+ の 32-bit OS（`armv7l`）では Editor を提供しない。Editor は [#177](https://github.com/gurezo/chirimen-raspi-docker/issues/177) で optional（Compose profile `editor`）にした
- Microsoft 独占拡張は使えない。必須セット（HTML / CSS / Prettier / ESLint / 日本語パック）には含まれない
- Example workspace では ESLint が動かない（`eslint` / `node_modules` が無い）。Prettier は Editor のみ採用し、repo の format CI には入れない。Nx 導入後の再評価は [#180](https://github.com/gurezo/chirimen-raspi-docker/issues/180)
- Editor image の extra package 例外は `python3-minimal` のみ（#179）。Node は入れない
- 実機での Editor 起動確認は [#182](https://github.com/gurezo/chirimen-raspi-docker/issues/182)。単独 image の build / run は [#174](https://github.com/gurezo/chirimen-raspi-docker/issues/174)。Compose は [#175](https://github.com/gurezo/chirimen-raspi-docker/issues/175)。初期設定の再現は Example `.vscode`（#178）。Example 編集は [#179](https://github.com/gurezo/chirimen-raspi-docker/issues/179)。`Supported` とは書かない
