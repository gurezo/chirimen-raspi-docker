# GHCR 公開仕様

GitHub Container Registry (GHCR) へ公開する Docker image の名前を定める。platform、tag、visibility は後続節で定める。GitHub Actions の publish workflow、通常利用 Compose の image 差し替え、Getting Started の手順更新はここでは扱わない。

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
