# Browser Editor 技術選定

Phase 8 で利用する Browser ベースの VS Code 系 Editor を記録する。

関連:

- 親 Issue: [#172 Phase 8: Browser Development Environment](https://github.com/gurezo/chirimen-raspi-docker/issues/172)
- 子 Issue: [#173 Browser Editor の技術選定を行う](https://github.com/gurezo/chirimen-raspi-docker/issues/173)
- 後続: [#174 Docker image](https://github.com/gurezo/chirimen-raspi-docker/issues/174) / [#175 Compose](https://github.com/gurezo/chirimen-raspi-docker/issues/175) / [#176 永続化](https://github.com/gurezo/chirimen-raspi-docker/issues/176) / [#177 optional service](https://github.com/gurezo/chirimen-raspi-docker/issues/177) / [#178 Extension](https://github.com/gurezo/chirimen-raspi-docker/issues/178) / [#181 Security](https://github.com/gurezo/chirimen-raspi-docker/issues/181) / [#183 利用ガイド](https://github.com/gurezo/chirimen-raspi-docker/issues/183)
- [overview.md](./overview.md)
- [docker.md](./docker.md)

## Status

Proposed（調査中。採用決定は後続節）

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

本 Issue では Docker image / Compose を追加しない。実装は #174 以降。

## 第一候補: code-server

初期候補は [Coder `code-server`](https://github.com/coder/code-server) である。VS Code を patch して Browser から利用できるようにした self-hosted Editor で、公式 Docker image と password 認証を持つ。

一次情報:

- [Install](https://coder.com/docs/code-server/install)
- [FAQ](https://coder.com/docs/code-server/FAQ)
- [Releases](https://github.com/coder/code-server/releases)
- [Docker Hub `codercom/code-server`](https://hub.docker.com/r/codercom/code-server)

メンテナは Coder。Desktop GUI 版 VS Code を container 内で直接起動する構成は、親 Issue の Out of Scope のため評価しない。

## Architecture

Raspberry Pi で利用する architecture は次の2系統である。Runtime の Compatibility 正本は [docker.md の Compatibility matrix](./docker.md#compatibility-matrix)。

| Architecture | 典型環境 | Runtime | Editor 調査結果 |
| --- | --- | --- | --- |
| `arm64`（`aarch64`） | Pi 3 / 4 / 5 の 64-bit OS。Pi 4 / 5 の 32-bit OS でも kernel は 64-bit のため `uname -m` は `aarch64` | 64-bit Dockerfile（Node 24） | 公式 Docker image / GitHub release が対応 |
| `arm32` / `armv7`（`armv7l`） | Pi 3 B+ の 32-bit OS など | `Dockerfile.32bit`（Node 22） | 公式 Docker image / 現行 GitHub release に資産が無い |

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

本リポジトリでは `latest` を使わず、semver タグで pin する方針を後続節で決める。image 作成は [#174](https://github.com/gurezo/chirimen-raspi-docker/issues/174)。

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
