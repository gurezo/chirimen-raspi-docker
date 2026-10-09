# GHCR 公開仕様

GitHub Container Registry (GHCR) へ公開する Docker image の名前、platform、tag、visibility を定める。publish workflow のファイル、通常利用 Compose の image 差し替え、Getting Started の手順更新は後続 issue で行う。このページは、その実装が従う契機だけを残す。

関連:

- 親 Issue: [#372 GHCR で pre-built Docker image を提供し Runtime 利用時の local build を不要にする](https://github.com/gurezo/chirimen-raspi-docker/issues/372)
- 子 Issue: [#373 GHCR image / tag / platform の公開仕様を確定する](https://github.com/gurezo/chirimen-raspi-docker/issues/373)
- [Docker 構成](./docker.md)
- [Architecture overview](./overview.md)
- [`compose.yaml`](../../compose.yaml)

## 公開 image

独立した Dockerfile は 5 つある。いずれも既定の `docker compose up -d` が起動するサービスである。親 Issue が名指しした Runtime / Example Server / Example Catalog に加え、Editor と Gateway も公開する。公開しないと、image が無い環境では Editor と Gateway の local build が残り、Raspberry Pi 3 B+ の Runtime-only 利用でも build が必要になる。

`chirimen-examples` は [#370](https://github.com/gurezo/chirimen-raspi-docker/issues/370) で `chirimen-example-server` に改名済みである。GHCR 名は改名後のサービス名を使う。

ローカル image 名（`chirimen-raspi-docker/...`）は現行の Compose のままである。GHCR 名への切り替えは後続 issue で行う。`codercom/code-server:4.132.0` と `nginx:1.30.4-alpine` は base image の pin であり、GHCR の image 名でも tag でもない。

| Compose service | Dockerfile | 現行ローカル image | GHCR image |
| --- | --- | --- | --- |
| `chirimen-runtime` | [`docker/server/Dockerfile`](../../docker/server/Dockerfile) | `chirimen-raspi-docker/server:phase1` | `ghcr.io/gurezo/chirimen-runtime` |
| `chirimen-editor` | [`docker/editor/Dockerfile`](../../docker/editor/Dockerfile) | `chirimen-raspi-docker/editor:4.132.0` | `ghcr.io/gurezo/chirimen-editor` |
| `chirimen-example-server` | [`docker/example-server/Dockerfile`](../../docker/example-server/Dockerfile) | `chirimen-raspi-docker/example-server:phase8` | `ghcr.io/gurezo/chirimen-example-server` |
| `chirimen-example-catalog` | [`docker/example-catalog/Dockerfile`](../../docker/example-catalog/Dockerfile) | `chirimen-raspi-docker/example-catalog:phase8` | `ghcr.io/gurezo/chirimen-example-catalog` |
| `chirimen-gateway` | [`docker/nginx/Dockerfile`](../../docker/nginx/Dockerfile) | `chirimen-raspi-docker/gateway:phase8` | `ghcr.io/gurezo/chirimen-gateway` |

GHCR の image 名は `ghcr.io/<owner>/<image>` である。owner はリポジトリ所有者の `gurezo` とする。image 名は Compose のサービス名と揃え、リポジトリ名 `chirimen-raspi-docker` は package 名にしない。

```text
ghcr.io/gurezo/chirimen-runtime
ghcr.io/gurezo/chirimen-editor
ghcr.io/gurezo/chirimen-example-server
ghcr.io/gurezo/chirimen-example-catalog
ghcr.io/gurezo/chirimen-gateway
```

上記以外の独立した Dockerfile はリポジトリに無い。公開対象はこの 5 image で確定する。

## Platform

公開する image manifest の platform は `linux/arm64` のみとする。対象は Raspberry Pi 3 B+ / 4 / 5 の Raspberry Pi OS 64-bit である。

| 公開 | platform | 対象 |
| --- | --- | --- |
| する | `linux/arm64` | Raspberry Pi OS 64-bit（Pi 3 B+ / 4 / 5） |
| しない | `linux/arm/v7` | Raspberry Pi OS 32-bit。image は作らない |
| しない | `linux/amd64` | GHCR の初期スコープ外。multi-architecture は対象外 |

32-bit OS 向け image は公開しない。`Dockerfile.32bit` は [#339](https://github.com/gurezo/chirimen-raspi-docker/issues/339) で削除済みである。背景は [Historical: 32-bit Compatibility](./compatibility-32bit.md)。

Editor と Gateway の Dockerfile は、ローカル build で `linux/amd64` を許す記述がある。GHCR へ push する manifest は `linux/arm64` のみとする。on-device の Docker build 対象機種（Pi 4 / Pi 5）は [Docker 構成](./docker.md) と [Compatibility](./compatibility.md) のままである。

## Tag

通常利用向けに動く tag と、検証で digest を特定できる tag を分ける。

| tag | 更新 | 付与するとき | 用途 |
| --- | --- | --- | --- |
| `latest` | 移動する | git tag `vX.Y.Z` の公開時だけ。`main` の push では動かさない | 通常利用。後続の Compose が参照する |
| `X.Y.Z` | 公開後は動かさない | 同じ git tag | 安定版の明示 |
| `vX.Y.Z` | 公開後は動かさない | 同じ git tag。`X.Y.Z` と同じ digest | git tag 文字列との対応 |
| `sha-<12桁>` | 動かさない | すべての公開（git tag と `main`） | 検証・再現 |
| `main` | 移動する | `main` への push | 開発確認。Getting Started では使わない |

`sha-` の 12 桁は `git rev-parse --short=12 HEAD` の短縮 SHA とする。現行 Compose の `phase1` / `phase8` と、Editor base image の pin `4.132.0` は GHCR tag にしない。

通常利用の参照名:

```text
ghcr.io/gurezo/chirimen-runtime:latest
ghcr.io/gurezo/chirimen-editor:latest
ghcr.io/gurezo/chirimen-example-server:latest
ghcr.io/gurezo/chirimen-example-catalog:latest
ghcr.io/gurezo/chirimen-gateway:latest
```

検証では `sha-<12桁>` を使う。表記例は `ghcr.io/gurezo/chirimen-runtime:sha-7549d05abcde` である。この文字列は形式の例であり、公開済み digest ではない。

## 公開の契機

workflow ファイルは [#375](https://github.com/gurezo/chirimen-raspi-docker/issues/375) で追加する。契機と付与 tag は次のとおり。

| 契機 | 付与する tag |
| --- | --- |
| git tag `vX.Y.Z` | `X.Y.Z`、`vX.Y.Z`、`sha-<12桁>`。`latest` をその digest へ更新する |
| `main` への push | `sha-<12桁>` と `main` |
| `workflow_dispatch` | 最初の `vX.Y.Z` が無い段階の bootstrap。`sha-<12桁>` と `main` を出す。`latest` は実行時に明示したときだけ更新する |

`vX.Y.Z` は `v` に続く major.minor.patch とする。各要素は非負整数であり、pre-release 接尾辞は付けない。

## Visibility

package は public とする。通常利用者は PAT なしで `docker pull` と `docker compose pull` できる。

`GITHUB_TOKEN` による初回 push は package を private で作ることがある。各 image の初回公開のあと、GitHub の package 設定で visibility を public にする。

1. image を一度 push する
2. `https://github.com/users/gurezo/packages/container/<image>/settings` を開く。`<image>` は `chirimen-runtime` のように owner 配下の container 名である
3. package visibility を Public にする
4. 公開対象の 5 package すべてで繰り返す

## リポジトリとの関連

各 image に次の OCI label を付ける。

```text
org.opencontainers.image.source=https://github.com/gurezo/chirimen-raspi-docker
```

同一リポジトリの `GITHUB_TOKEN`（`packages: write`）で push し、この label で package を `gurezo/chirimen-raspi-docker` に関連付ける。image 名はリポジトリ名とは別に、[公開 image](#公開-image) の GHCR 名を使う。

## 後続

仕様の実装は別 issue である。

- [#374](https://github.com/gurezo/chirimen-raspi-docker/issues/374) Dockerfile を GitHub Actions / GHCR build に対応させる
- [#375](https://github.com/gurezo/chirimen-raspi-docker/issues/375) GitHub Actions から GHCR へ image を publish する
- [#376](https://github.com/gurezo/chirimen-raspi-docker/issues/376) 通常利用の Compose を GHCR pre-built image に変更する
- [#377](https://github.com/gurezo/chirimen-raspi-docker/issues/377) Development / local build 用 Compose を分離する
- [#378](https://github.com/gurezo/chirimen-raspi-docker/issues/378) Pi 3 B+ / Pi 4 / Pi 5 で GHCR image の pull / run を実機検証する
- [#379](https://github.com/gurezo/chirimen-raspi-docker/issues/379) Getting Started / Development Documentation を GHCR 構成へ更新する
