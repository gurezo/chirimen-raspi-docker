# 32-bit Compatibility (Historical / Unsupported)

← [Compatibility](./compatibility.md)（現行の 64-bit Support Policy）

```text
Status: Historical / Unsupported

Raspberry Pi OS 32-bit is no longer supported by chirimen-raspi-docker.

This document is retained as a technical record of previous
compatibility testing and implementation decisions.
```

## この文書の位置づけ

**このページは現行の Getting Started / セットアップ手順ではない。**

- 現行のサポート対象・手順: [Getting Started](../guides/getting-started.md) / [Compatibility](./compatibility.md)
- 標準環境: Raspberry Pi 3 B+ / 4 / 5 の **Raspberry Pi OS 64-bit**（Desktop を標準。Lite も可）
- 本ページの役割: 過去の 32-bit 実機検証・architecture 判定・Node / Nx / esbuild workaround の技術記録

Verified でも `Supported` / Recommended とは書かない。推測の新事実は追加しない。根拠は [#135](https://github.com/gurezo/chirimen-raspi-docker/issues/135) の実機検証記録と親 [#337](https://github.com/gurezo/chirimen-raspi-docker/issues/337) の方針である。

## Why 32-bit is not recommended

推奨環境は Raspberry Pi 3 B+ / 4 / 5 の **Raspberry Pi OS Lite 64-bit** である。32-bit OS では Runtime と Browser Editor を同じ手順では保証しない。当時の `./scripts/start.sh --32bit` は Runtime only だった。

Pi 3 B+ 32-bit は `armv7l` である。Node 24 公式 Docker image に `linux/arm/v7` が無いため、検証時は Node 22 / 当時の `docker/server/Dockerfile.32bit` を使った。

新しい理由は推測で追加しない。根拠は [#135](https://github.com/gurezo/chirimen-raspi-docker/issues/135) の実機検証記録である。

## Runtime / Docker constraints

現行の supported path は 64-bit のみである。32-bit 用 `Dockerfile.32bit` は [#339](https://github.com/gurezo/chirimen-raspi-docker/issues/339) で削除済み。以下は検証当時の構成記録である。

| OS | 当時のファイル | ベース | 備考 |
| --- | --- | --- | --- |
| 64-bit（`aarch64` など） | [`docker/server/Dockerfile`](../../docker/server/Dockerfile) | `node:24-bookworm-slim` | サポート対象（現行も同じ） |
| 32-bit（`armv7l` など） | `docker/server/Dockerfile.32bit`（削除済み） | `node:22-bookworm-slim` | サポート対象外。Historical のみ |

### 当時の `Dockerfile.32bit` 導入理由（Historical）

- Node 24 公式 image に `linux/arm/v7` が無かったため、32-bit（`armv7l`）検証では Node 22（`node:22-bookworm-slim`）を使った
- Nx の native bindings / WASM fallback が `linux/arm/v7` で失敗した（`hashArray is not a function`）。そのため build は `pnpm nx build server` ではなく `node scripts/build-server.mjs`（esbuild 直呼び bundle）だった
- stage 構成は 64-bit `Dockerfile` と揃え、差分は `FROM` と build コマンドのみとした
- image tag は `chirimen-raspi-docker/server:phase1-32bit` だった

- 32-bit 用 build は当時 `scripts/build-server.mjs`（esbuild 直呼び bundle）。スクリプト本体は [#341](https://github.com/gurezo/chirimen-raspi-docker/issues/341) で削除済み。64-bit の現行 build は `pnpm nx build server`（`@nx/esbuild:esbuild`）
- 当時の `./scripts/start.sh --32bit` は Runtime only（Editor / Examples / Catalog を起動しない）。flag は [#340](https://github.com/gurezo/chirimen-raspi-docker/issues/340) で削除済み
- Pi 4 / Pi 5 の 32-bit OS は 32-bit userland でも **64-bit kernel が default** のため、`uname -m` は `aarch64` になる。当時の `start.sh` は 64-bit 用 Dockerfile（Node 24）を選びえた
- Pi 5 の native rebuild `EAI_AGAIN` は [#167](https://github.com/gurezo/chirimen-raspi-docker/pull/167) の `nodedir` 設定で回避する

## Raspberry Pi 3 B+ verification

サポート対象外。Raspberry Pi 3 Model B+（Raspbian OS 32-bit / `armv7l` / kernel `6.18.34+rpt-rpi-v7`）での Runtime E2E 記録。[#135](https://github.com/gurezo/chirimen-raspi-docker/issues/135)。32-bit では Node 24 公式 image に `linux/arm/v7` が無いため、当時は `./scripts/start.sh --32bit` が `docker/server/Dockerfile.32bit`（Node 22）を選んだ。

| Item | Result |
| --- | --- |
| OS | Raspbian OS 32-bit |
| Kernel | `6.18.34+rpt-rpi-v7` |
| Architecture | `armv7l` |
| host paths | `/sys/class/gpio`・`/dev/gpiomem`・`/dev/gpiochip0` / `1` / `2` / `4` あり。`/dev/i2c-1` あり |
| start mapping | `sysfs=yes` / `gpiomem=/dev/gpiomem` / `gpiochip=0,1,2,4` / `i2c-1=yes` |
| capability | `gpio=sysfs` / `i2c=i2c-dev` |
| GPIO | WebSocket `gpio.export`（port `26` / `out`）成功。gpiochip 専用 backend は不要 |
| I2C | `/dev/i2c-1` 存在時に `i2c-dev` backend を選択 |
| WebSocket | 接続、および `gpio.export` の request/response 成功 |
| cleanup | 切断時の session cleanup で未 unexport pin が消える。`docker compose down` 後も残留なし |
| image | `chirimen-raspi-docker/server:phase1-32bit`（esbuild bundle） |
| Status | Verified（サポート対象外。`Supported` とは書かない） |

## Raspberry Pi 4 verification

サポート対象外。Raspberry Pi 4 Model B Rev 1.4（Raspbian OS 32-bit / kernel `6.18.34+rpt-rpi-v8` / `aarch64`）での Runtime E2E 記録。[#135](https://github.com/gurezo/chirimen-raspi-docker/issues/135)。Pi 4 向け 32-bit OS は 32-bit userland でも **64-bit kernel が default** のため、`uname -m` は `aarch64` になる（Pi 3 B+ 32-bit の `armv7l` / `v7` とは異なる）。

| Item | Result |
| --- | --- |
| OS | Raspbian OS 32-bit |
| Kernel | `6.18.34+rpt-rpi-v8` |
| Architecture | `aarch64` |
| doctor | All checks passed。architecture は `aarch64`。`[ capabilities ] gpio=sysfs i2c=i2c-dev` |
| host paths | `/sys/class/gpio`（chip0 / chip1、gpiochip512 / gpiochip570）・`/dev/gpiomem`・`/dev/gpiochip0` / `1` / `4` あり。`/dev/i2c-1` あり |
| start mapping | `sysfs=yes` / `gpiomem=/dev/gpiomem` / `gpiochip=0,1,4` / `i2c-1=yes` |
| capability | `gpio=sysfs` / `i2c=i2c-dev` |
| GPIO | WebSocket `gpio.export`（port `26` / `out`）成功。gpiochip 専用 backend は不要 |
| I2C | `/dev/i2c-1` 存在時に `i2c-dev` backend を選択 |
| WebSocket | 接続、および `gpio.export` の request/response 成功 |
| cleanup | 切断時の session cleanup で未 unexport pin が消える。`docker compose down` 後も残留なし |
| image | — |
| Status | Verified（サポート対象外。`Supported` とは書かない） |

## Raspberry Pi 5 verification

サポート対象外。Raspberry Pi 5 Model B Rev 1.0（Raspbian OS 32-bit / kernel `6.18.34+rpt-rpi-v8` / `aarch64`）での Runtime E2E 記録。[#135](https://github.com/gurezo/chirimen-raspi-docker/issues/135)。Pi 5 向け 32-bit OS は 32-bit userland でも **64-bit kernel が default** のため、`uname -m` は `aarch64` になる（64-bit OS の kernel `2712` とは異なる。Pi 3 B+ 32-bit の `armv7l` / `v7` とも異なる）。

| Item | Result |
| --- | --- |
| OS | Raspbian OS 32-bit |
| Kernel | `6.18.34+rpt-rpi-v8` |
| Architecture | `aarch64` |
| doctor | All checks passed。architecture は `aarch64`。`[ capabilities ] gpio=sysfs i2c=i2c-dev` |
| host paths | `/sys/class/gpio`（chip0 / chip10–13、gpiochip512 / 529 / 535 / 567 / 571）・`/dev/gpiomem0`–`4`・`/dev/gpiochip0` / `10` / `11` / `12` / `13` / `4` あり。`/dev/i2c-1` あり |
| start mapping | `sysfs=yes` / `gpiomem=0,1,2,3,4` / `gpiochip=0,10,11,12,13,4` / `i2c-1=yes` |
| capability | `gpio=sysfs` / `i2c=i2c-dev` |
| GPIO | WebSocket `gpio.export`（port `26` / `out`）成功。gpiochip 専用 backend は不要 |
| I2C | `/dev/i2c-1` 存在時に `i2c-dev` backend を選択 |
| WebSocket | 接続、および `gpio.export` の request/response 成功 |
| cleanup | 切断時の session cleanup で未 unexport pin が消える。`docker compose down` 後も残留なし |
| image | `chirimen-raspi-docker/server:phase1-32bit`（当時 `./scripts/start.sh --32bit`、esbuild bundle） |
| Status | Verified（サポート対象外。`Supported` とは書かない） |

## Known limitations

- 32-bit OS はサポート対象外。Verified でも `Supported` / Recommended とは書かない
- Runtime と Browser Editor を同じ手順では保証しない。当時の `./scripts/start.sh --32bit` は Runtime only だった
- Pi 3 B+ 32-bit は `armv7l`。Node 24 公式 Docker image に `linux/arm/v7` が無いため、検証時は Node 22 / `Dockerfile.32bit` を使った（当該ファイルは [#339](https://github.com/gurezo/chirimen-raspi-docker/issues/339) で削除済み）
- Pi 4 / Pi 5 の 32-bit OS は `uname -m` が `aarch64` のため、当時の `start.sh` は 64-bit 用 Dockerfile（Node 24）を選びえた
- Pi 5 の native rebuild `EAI_AGAIN` は [#167](https://github.com/gurezo/chirimen-raspi-docker/pull/167) の `nodedir` 設定で回避する

## Related Issues

- 親 Issue: [#337 Raspberry Pi OS 32-bit をサポート対象外とし Runtime を 64-bit に一本化する](https://github.com/gurezo/chirimen-raspi-docker/issues/337)
- 子 Issue: [#344 Raspberry Pi OS 32-bit の検証結果と support 終了背景を Historical Documentation として保存する](https://github.com/gurezo/chirimen-raspi-docker/issues/344)
- 子 Issue: [#339 Dockerfile.32bit と arm/v7 Docker build path を削除する](https://github.com/gurezo/chirimen-raspi-docker/issues/339)
- 親 Issue: [#224 Documentation を初見ユーザー向けに再構成する](https://github.com/gurezo/chirimen-raspi-docker/issues/224)
- 子 Issue: [#227 Compatibility を 64-bit 推奨環境中心に再設計する](https://github.com/gurezo/chirimen-raspi-docker/issues/227)
- 子 Issue: [#228 32-bit Compatibility を独立ページへ分離する](https://github.com/gurezo/chirimen-raspi-docker/issues/228)
- 実機検証: [#135 32-bit](https://github.com/gurezo/chirimen-raspi-docker/issues/135)
- native rebuild: [#167 nodedir](https://github.com/gurezo/chirimen-raspi-docker/pull/167)
